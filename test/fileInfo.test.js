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
    //console.log(`content: ${content}`);
    const compiled = JSON.parse(content);
    // console.log("compiled:", compiled);
    // _.keys(compiled, key => {
    //     console.log(`${key}: ${compiled[key]}`);
    // })
    //console.log("compiled:" , compiled.contracts["FileInfo.sol"].FileInfo.abi);
    const web3 = await web3_commons.initHTTPWeb3('http://192.168.56.123:8565', {
        headers: {
            Origin: "http://localhost"
        }
    });

    const accounts = await web3.eth.getAccounts();
    //web3.eth.get
    const newContract = web3.eth.Contract(compiled.contracts["FileInfo.sol"].FileInfo.abi);
    t.truthy(newContract);

    const creator = accounts[0];
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
    
    const promEvent = instance.methods.addFileInfo(fileHash, fInfo, initComment).send({from: sender, value: fee, gas: 3000000,
        gasPrice: '1000000000'});
    promEvent
    .once('transactionHash', (transactionHash) => { console.info(`transactionHash: ${transactionHash}`); });
    const contractevents = await bb.any([bb.delay(30*1000).then(()=> bb.reject('get addFileInfo receipt')), new bb((resolve, reject) => {
        promEvent.on('error', (error) => { console.error(`addFileInfo txn error: ${error}`); reject(error); })
        .once('receipt', (receipt) => {
            //console.log(receipt.contractAddress) // contains the new contract address
            resolve(receipt.logs);
        })
        .once('confirmation', (confirmationNumber, receipt) => { 
            console.log(`confirmation: ${confirmationNumber}, receipt.logs: ${receipt.logs}`);
            resolve(receipt.logs);
        });
    })]);
    t.is(contractevents.length, 1);
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
    //console.log(result);
    t.truthy(result);
    t.is(result.fee.toString(), fee);
    t.deepEqual(_.pick(result, ['fInfo', 'initComment']), {fInfo, initComment});

    let result2 = await instance.methods.getFileInfo(fileHash, sender).call({from: sender});
    t.deepEqual(result2, result);


});