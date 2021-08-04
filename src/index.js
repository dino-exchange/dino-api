const express = require("express");
const Web3 = require("web3");
const contractInfo = require('./export.json');

const tokenAbi = contractInfo.contracts.DinoToken.abi;
const tokenAddress = "0xf317932ee2C30fa5d0E14416775977801734812D";
const lockedAddress = [
    "0x29e87ebae96960768153ff33610420fe5f94d6df",
    "0xbe85104b960619debcdda195e12562e33282d2a7"
];

let supplyCache = "5826697.812793015194880719";
let supplyCacheTime = 0;

async function getCirculatingSupply() {
    if (Date.now() - supplyCacheTime > 300000) {
        console.log("getCirculatingSupply update cache");
        try {
            const web3 = new Web3("https://bsc-dataseed.binance.org");
            const tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);
            let supply = web3.utils.toBN(await tokenContract.methods.totalSupply().call());
            for (let address of lockedAddress) {
                const balance = await tokenContract.methods.balanceOf(address).call();
                supply = supply.sub(web3.utils.toBN(balance));
            }
            supplyCache = web3.utils.fromWei(supply.toString(), "ether");
            supplyCacheTime = Date.now();
        } catch (err) { console.log("getCirculatingSupply error:", err) }
    }
    return supplyCache;
}

const app = express();
app.get("/supply", async function (req, res) {
    res.setHeader('content-type', 'text/plain');
    res.send(await getCirculatingSupply());
});

app.listen(1786);