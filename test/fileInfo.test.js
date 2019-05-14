const test = require('ava');
const fs = require('fs');
const crypto = require('crypto');
const web3_commons = require('web3_commons');
const _ = require('lodash');
const bb = require('bluebird');
const compiledFile = require('./compile_constants').compiledFile;

test.before("read compiled contracts & deploy to a geth node", async t => {
    //await bb.delay(5);
    console.log(`compiledFile: ${compiledFile}`);
    const data = fs.readFileSync(compiledFile);

    const content = data.toString();
    t.truthy(content);
    const compiled = JSON.parse(content);
   
    const web3 = await web3_commons.initHTTPWeb3('http://192.168.56.123:8565', {
        headers: {
            Origin: "http://localhost"
        }
    });

    const accounts = await web3.eth.getAccounts();
    //web3.eth.get
    const newContract = web3.eth.Contract(compiled.contracts["FileInfo.sol"].FileInfo.abi);
    t.truthy(newContract);

    const creator = accounts[2];
    const deployEvent = newContract.deploy({
        data: '0x' + compiled.contracts["FileInfo.sol"].FileInfo.evm.bytecode.object
    }).send({
        from: creator,
        gas: 3000000,
        gasPrice: '1000000000'
    });
    deployEvent
    .once('transactionHash', (transactionHash) => { console.info(`transactionHash: ${transactionHash}`); });
    const contractAddr = await bb.any([bb.delay(30*1000).then(()=> bb.reject('get contractAddr timeout')), new bb((resolve, reject) => {
        deployEvent.on('error', (error) => { console.error(`deploy error: ${error}`); reject(error); })
        .once('receipt', (receipt) => {
            console.log(receipt.contractAddress) // contains the new contract address
            resolve(receipt.contractAddress);
        })
        .once('confirmation', (confirmationNumber, receipt) => { 
            console.log(`confirmation: ${confirmationNumber}, receipt.contractAddress: ${receipt.contractAddress}`);
            //deployEvent.removeAllListeners('confirmation')
            resolve(receipt.contractAddress);
        });
    })]);
    t.truthy(contractAddr);
    const newContractInstance = newContract.clone(); 
    newContractInstance.address = contractAddr;
    t.truthy(newContractInstance.methods.creator);

    const creator_result = await newContractInstance.methods.creator.call({from: accounts[1]});
    t.is(creator_result, creator);

    t.is(await web3.eth.getBalance(newContractInstance.address), '0');
    
    t.context.contract = {instance: newContractInstance, creator};
    t.context.accounts = accounts;
    t.context.web3 = web3;
});

const fileHash = '0x' + crypto.randomBytes(32).toString('hex');
const fInfo = '{name:"复仇者联盟4"}', initComment = 'good; 挺好的。'
let fee;
test.serial("test addFileInfo(bytes32 fileHash, string memory fInfo, string memory initComment)", async t => {
    const instance = t.context.contract.instance,  web3 = t.context.web3;
    const sender = t.context.accounts[1];
    fee = web3.utils.toWei("1", 'finney');
    
    const receipt = await addFileInfo(instance, fileHash, fInfo, initComment, fee, sender);
    const contractevents = receipt.logs;
    t.is(contractevents.length, 1);
    t.is(await web3.eth.getBalance(instance.address), fee);
    //event AddFileInfo(address sender, bytes32 fileHash, string fInfo, string initComment, uint fee);
    const addFileInfoEvent = web3.eth.abi.decodeLog([{
        type: "address",
        "name": "sender"
    },{
        type: 'bytes32',
        name: 'fileHash'
    },{
        type: 'string',
        name: 'fInfo',
    },{
        type: 'string',
        name: 'initComment',
    }, {
        type:"uint",
        name: "fee"
    }], contractevents[0].data, contractevents[0].topics);
    t.is(addFileInfoEvent.fee.toString(), fee);
    t.deepEqual(_.pick(addFileInfoEvent, ['sender', 'fileHash', 'fInfo', 'initComment']), {sender, fileHash, fInfo, initComment});
});

test.serial("getFileInfo(bytes32 fileHash) && getFileInfo(bytes32 fileHash, address sender)", async t => {
    const instance = t.context.contract.instance;
    const sender = t.context.accounts[1]
    let result = await instance.methods.getFileInfo(fileHash).call({from: sender});
    
    t.truthy(result);
    t.is(result.fee.toString(), fee);
    t.deepEqual(_.pick(result, ['fInfo', 'initComment']), {fInfo, initComment});

    let result2 = await instance.methods.getFileInfo(fileHash, sender).call({from: sender});
    t.deepEqual(result2, result);

});

test.serial("getFileInfoSize && getFileInfoByIndex", async t => {
    const instance = t.context.contract.instance,  web3 = t.context.web3;
    const sender = t.context.accounts[1];
    const another_sender = t.context.accounts[0];
    let result = await instance.methods.getFileInfoSize(fileHash).call({from: sender});
    // console.log(result);
    t.is(result.toString(), "1");
    fee = web3.utils.toWei("2", 'finney');
    const receipt = await addFileInfo(instance, fileHash, fInfo, initComment, fee, sender);
    const contractevents = receipt.logs;
    t.is(contractevents.length, 1);
    result = await instance.methods.getFileInfoSize(fileHash).call({from: sender});
    t.is(result.toString(), "1");

    //another sender add fileInfo
    await addFileInfo(instance, fileHash, fInfo, initComment, fee, another_sender);
    t.is(await web3.eth.getBalance(instance.address), web3.utils.toWei("5", 'finney'));
    result = await instance.methods.getFileInfoByIndex(fileHash, 0).call({from: sender});
    t.truthy(result);
    t.is(result.fee.toString(), web3.utils.toWei("3", 'finney'));
    t.deepEqual(_.pick(result, ['fInfo', 'initComment', 'sender']), {fInfo, initComment, sender});

    //test another sender add fileInfo
    result = await instance.methods.getFileInfoByIndex(fileHash, 1).call({from: sender});
    t.is(result.fee.toString(), web3.utils.toWei("2", 'finney'));
    t.deepEqual(_.pick(result, ['fInfo', 'initComment', 'sender']), {fInfo, initComment, sender: another_sender});
});

test.serial("transferToCreator", async t => {
    const {instance, creator} = t.context.contract,  web3 = t.context.web3;
    t.truthy(creator);
    const initB = await web3.eth.getBalance(creator);
    const initContractB = await web3.eth.getBalance(instance.address);
    // console.log(web3.utils.fromWei(initB, 'finney'));
    // console.log(`contract initContractB: ${initContractB}`)
    t.truthy(initB);
    const gasPrice = '1000000000';
    const txn = instance.methods.transferToCreator().send({from: creator, gas: 300000,
        gasPrice});
    const recpt = await waitForTxnReceipt(txn);
    t.truthy(recpt);
    t.is(await web3.eth.getBalance(instance.address), '0');
    const b = web3.utils.toBN(await web3.eth.getBalance(creator));
    const diff = b.sub(web3.utils.toBN(initB));
    const gasUsed = web3.utils.toBN(recpt.gasUsed).mul(web3.utils.toBN(gasPrice));
    t.deepEqual(initContractB, diff.add(gasUsed).toString());
    // console.log(web3.utils.fromWei(b.sub(web3.utils.toBN(initB)).toString(), 'finney'));
    // console.log(web3.utils.fromWei(web3.utils.toBN(recpt.gasUsed).mul(web3.utils.toBN(1000000000)).toString(), 'finney'));
});

async function addFileInfo(instance, fileHash, fInfo, initComment, fee, sender) {
    const promEvent = instance.methods.addFileInfo(fileHash, fInfo, initComment).send({from: sender, value: fee, gas: 3000000,
        gasPrice: '1000000000'});
    return waitForTxnReceipt(promEvent);
}

function waitForTxnReceipt(txn) {
    txn
    .once('transactionHash', (transactionHash) => { console.info(`transactionHash: ${transactionHash}`); });
    return bb.any([bb.delay(30*1000).then(()=> bb.reject('get addFileInfo receipt')), new bb((resolve, reject) => {
        txn.on('error', (error) => { console.error(`addFileInfo txn error: ${error}`); reject(error); })
        .once('receipt', (receipt) => {
            resolve(receipt);
        })
        .once('confirmation', (confirmationNumber, receipt) => { 
            console.log(`confirmation: ${confirmationNumber}, receipt.logs: ${receipt.logs}`);
            resolve(receipt);
        });
    })]);
}