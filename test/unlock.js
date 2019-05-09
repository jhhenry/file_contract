const web3_commons = require('web3_commons');
const _ = require('lodash');

// run().then(isSuccess => {
//     if (isSuccess) {
//         console.log('all accounts unlocked');
//     } else {
//         console.log('failed to unlock all accounts');
//     }
// });

// async function run()
// {
//     const web3 = await web3_commons.initWSWeb3('ws://192.168.56.123:8566', {headers: {
//         Origin:  "http://localhost"
//         }});
//     const r = await web3_commons.unlockAllAccounts(web3, "highsharp", 36000);
//     const isSuccess = _.every(r, Boolean);
//     return Promise.resolve(isSuccess)

// }

function run() {
    web3_commons.initWSWeb3('ws://192.168.56.123:8566', {
        headers: {
            Origin: "http://localhost"
        }
    }).then(web3 => {
        return web3_commons.unlockAllAccounts(web3, "highsharp", 36000);
    }).then(r => {
        //console.log(r);
        const isSuccess = !_.isEmpty(r) && _.every(r, Boolean);
        if (isSuccess) {
            console.log('all accounts unlocked');
        } else {
            console.log('failed to unlock all accounts');
        }
    }).finally(() => process.exit(0));
}
console.log('running unlock script.')
run();

