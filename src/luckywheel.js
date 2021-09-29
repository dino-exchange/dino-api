const fs = require("fs");
const Web3 = require("web3");

const TESTNET = {
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    luckywheelAddress: "0x9A0d25f33cd4cE3fA63Fcc18BC2E47480480C714",
    spinTopic: "0xaa8757bb29f85b111680a82ef80931befbf95af7736e6996c8435b9f9d8bdeb3",
    logFile: "data/spin_testnet.log",
    lastBlock: 11983605
}
const MAINNET = {
    rpcUrl: "https://bsc-dataseed.binance.org",
    luckywheelAddress: "0x5367F50aAdC858985281472aB0550Ca978496eE7",
    spinTopic: "0xaa8757bb29f85b111680a82ef80931befbf95af7736e6996c8435b9f9d8bdeb3",
    logFile: "data/spin_mainnet.log",
    lastBlock: 11159106
}

const config = MAINNET;
const logFile = config.logFile;
const spinLog = fs.createWriteStream(config.logFile, { flags: "a" });

let lastBlock = config.lastBlock;
const totalReward = {};
const userHistory = {};

function updateCache(data) {
    if (lastBlock < data.blockNumber) lastBlock = data.blockNumber;
    const wallet = data.wallet;
    const reward = parseInt(data.reward);

    if (!totalReward[wallet]) totalReward[wallet] = { spinCount: 0, amount: 0 };
    totalReward[wallet].amount += reward;
    totalReward[wallet].spinCount++;

    if (!userHistory[wallet]) userHistory[wallet] = [];
    userHistory[wallet].push({ reward, claimStatus: 3, spinTime: data.spinTime });
}

function getTopReward(limit = 5) {
    const rs = [];
    for (let wallet in totalReward) {
        rs.push({ wallet, ...totalReward[wallet] });
    }
    return rs.sort((w1, w2) => { return w2.amount - w1.amount }).slice(0, limit);
}

function getUserHistory(wallet) {
    return userHistory[wallet] || [];
}

function loadLog() {
    const lines = fs.readFileSync(logFile, "utf8").split("\n");
    lines.forEach(line => {
        if (!line) return;
        updateCache(JSON.parse(line));
    });
    console.log(`Load ${lines.length} lines, lastBlock: ${lastBlock}`)
}

async function writeLog(web3, log) {
    const reward = web3.utils.fromWei(web3.utils.toBN(log.data), "ether");
    const wallet = "0x" + log.topics[1].substr(26);
    const spinTime = (await web3.eth.getBlock(log.blockNumber)).timestamp
    const data = { blockNumber: log.blockNumber, transactionHash: log.transactionHash, wallet, reward, spinTime };
    spinLog.write(JSON.stringify(data) + "\n");
    updateCache(data);
}

async function crawlLogs() {
    const web3 = new Web3(config.rpcUrl);
    const fromBlock = lastBlock + 1;
    let toBlock = await web3.eth.getBlockNumber();
    if (toBlock - fromBlock > 5000) toBlock = fromBlock + 5000;
    console.log(`Get logs from ${fromBlock} to ${toBlock}`);
    const pastLogs = await web3.eth.getPastLogs({
        fromBlock,
        toBlock,
        address: config.luckywheelAddress,
        topics: [config.spinTopic],
    })
    for (let log of pastLogs) {
        await writeLog(web3, log).catch(console.log);
    }
    lastBlock = toBlock;
}

loadLog();

setInterval(() => {
    crawlLogs().catch(console.log);
}, 10e3);

module.exports = { getTopReward, getUserHistory };
