const express = require("express");
const Web3 = require("web3");
const contractInfo = require('./export.json');

const tokenAbi = contractInfo.contracts.DinoToken.abi;
const dinoTokenAddress = "0xf317932ee2C30fa5d0E14416775977801734812D";

// Calculate Circulating Supply
const lockedAddress = [
    "0x29e87ebae96960768153ff33610420fe5f94d6df",
    "0xbe85104b960619debcdda195e12562e33282d2a7",
    "0x000000000000000000000000000000000000dead",
];
let supplyCache = "5826697.812793015194880719";
let supplyCacheTime = 0;

async function getCirculatingSupply() {
    if (Date.now() - supplyCacheTime > 300000) {
        console.log("getCirculatingSupply update cache");
        try {
            const web3 = new Web3("https://bsc-dataseed.binance.org");
            const dinoContract = new web3.eth.Contract(tokenAbi, dinoTokenAddress);
            let supply = web3.utils.toBN(await dinoContract.methods.totalSupply().call());
            for (let address of lockedAddress) {
                const balance = await dinoContract.methods.balanceOf(address).call();
                supply = supply.sub(web3.utils.toBN(balance));
            }
            supplyCache = web3.utils.fromWei(supply.toString(), "ether");
            supplyCacheTime = Date.now();
        } catch (err) { console.log("getCirculatingSupply error:", err) }
    }
    return supplyCache;
}

// Calculate Total Supply
const burnedAddress = [
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
];
let totalSupplyCache = "200000000";
let totalSupplyCacheTime = 0;

async function getTotalSupply() {
    if (Date.now() - totalSupplyCacheTime > 300000) {
        console.log("getTotalSupply update cache");
        try {
            const web3 = new Web3("https://bsc-dataseed.binance.org");
            const dinoContract = new web3.eth.Contract(tokenAbi, dinoTokenAddress);
            let totalSupply = web3.utils.toBN(await dinoContract.methods.totalSupply().call());
            for (let address of burnedAddress) {
                const balance = await dinoContract.methods.balanceOf(address).call();
                totalSupply = totalSupply.sub(web3.utils.toBN(balance));
            }
            totalSupplyCache = web3.utils.fromWei(totalSupply.toString(), "ether");
            totalSupplyCacheTime = Date.now();
        } catch (err) { console.log("getTotalSupply error:", err) }
    }
    return totalSupplyCache;
}

// Calculate Total Value Locked
const busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
const vaultAddress = "0x26CB55795Cff07Df3a1Fa9Ad0f51d6866a80943b";
const poolAddress = "0x34a0f0448eba31feb544a22888e0503af3c98803";
let tvlCache = "1857202.284856300643126711";
let tvlCacheTime = 0;

async function getTVL() {
    if (Date.now() - tvlCacheTime > 300000) {
        console.log("getTVL update cache");
        try {
            const web3 = new Web3("https://bsc-dataseed.binance.org");
            const dinoContract = new web3.eth.Contract(tokenAbi, dinoTokenAddress);
            const busdContract = new web3.eth.Contract(tokenAbi, busdAddress);

            const poolDinoBalance = web3.utils.toBN(await dinoContract.methods.balanceOf(poolAddress).call());
            const poolBusdBalance = web3.utils.toBN(await busdContract.methods.balanceOf(poolAddress).call());
            const vaultDinoBalance = web3.utils.toBN(await dinoContract.methods.balanceOf(vaultAddress).call());
            const tvl = vaultDinoBalance.mul(poolBusdBalance).div(poolDinoBalance).add(poolBusdBalance).add(poolBusdBalance);

            tvlCache = web3.utils.fromWei(tvl, "ether");
            tvlCacheTime = Date.now();
        } catch (err) { console.log("getTVL error:", err) }
    }
    return tvlCache;
}

// Basic info for landing page
let infoCache = "";
let infoCacheTime = 0;

async function getInfo() {
    if (Date.now() - infoCacheTime > 300000) {
        console.log("getInfo update cache");
        try {
            const web3 = new Web3("https://bsc-dataseed.binance.org");
            const dinoContract = new web3.eth.Contract(tokenAbi, dinoTokenAddress);
            const busdContract = new web3.eth.Contract(tokenAbi, busdAddress);

            const poolDinoBalance = web3.utils.toBN(await dinoContract.methods.balanceOf(poolAddress).call());
            const poolBusdBalance = web3.utils.toBN(await busdContract.methods.balanceOf(poolAddress).call());
            const vaultDinoBalance = web3.utils.toBN(await dinoContract.methods.balanceOf(vaultAddress).call());
            const tvl = vaultDinoBalance.mul(poolBusdBalance).div(poolDinoBalance).add(poolBusdBalance).add(poolBusdBalance);
            const vaultTvl = vaultDinoBalance.mul(poolBusdBalance).div(poolDinoBalance);
            const poolTvl = poolBusdBalance.add(poolBusdBalance);
            
            let info = {};
            info.tvl = web3.utils.fromWei(tvl, "ether");
            info.pool = [{
                name: "DINO Vault",
                tvl: web3.utils.fromWei(vaultTvl, "ether"),
                apy: 79,
                url: "https://app.dino.exchange/stake"
            }, {
                name: "DINO-BNB Pool",
                tvl: web3.utils.fromWei(poolTvl, "ether"),
                apy: 319,
                url: "https://app.dino.exchange/yield"
            }];
            infoCache = JSON.stringify(info);
            infoCacheTime = Date.now();
        } catch (err) { console.log("getInfo error:", err) }
    }
    return infoCache;
}

// Rest API
const app = express();

app.get("/totalsupply", async function (req, res) {
    res.setHeader('content-type', 'text/plain');
    res.send(await getTotalSupply());
});

app.get("/supply", async function (req, res) {
    res.setHeader('content-type', 'text/plain');
    res.send(await getCirculatingSupply());
});

app.get("/tvl", async function (req, res) {
    res.setHeader('content-type', 'text/plain');
    res.send(await getTVL());
});

app.get("/info", async function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('content-type', 'application/json');
    res.send(await getInfo());
});

app.listen(1786);