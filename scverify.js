const tronsolc = require('./tronsolc');
const TronWeb = require('tronweb');
const axios = require('axios');

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';
const fullNodeTestNet = 'https://api.shasta.trongrid.io';
const solidityNodeTestNet = 'https://api.shasta.trongrid.io';
const eventServerTestNet = 'https://api.shasta.trongrid.io';

const tronWebMainNet = new TronWeb(fullNode, solidityNode, eventServer, "143100215d5e872541219dd03b9580c853e81f73b8bd6a6c21d20fb9160ae0cd");
const tronWebTestNet = new TronWeb(fullNodeTestNet, solidityNodeTestNet, eventServerTestNet, "143100215d5e872541219dd03b9580c853e81f73b8bd6a6c21d20fb9160ae0cd");

exports.verify = async function (mainnet, address, sourceCode, contractName, solVersion, opmize = true, optimizerRuns = 0, createTxHash = false) {
  try {
    //KhanhND Get bytecode of contract at address
    let tronWeb = {}
    if (mainnet) tronWeb = tronWebMainNet
    else tronWeb = tronWebTestNet

    if (!createTxHash) {
      //KhanhND: Try to get create txHash
      let contractInfo = await axios.get("https://apilist.tronscan.org/api/contract?contract=" + address);
      createTxHash = contractInfo.data.data[0].creator.txHash;
    }
    let tx = await tronWeb.trx.getTransaction(createTxHash);
    let createByteCode = tx.raw_data.contract[0].parameter.value.new_contract.bytecode;
    //KhanhND Compile
    let compiler = await tronsolc.loadVersion(solVersion);
    let entrySource = {};
    entrySource[address] = { content: sourceCode };
    let input = {
      language: "Solidity",
      sources: entrySource,
      settings: {
        optimizer: {
          enabled: opmize,
          runs: optimizerRuns
        },
        outputSelection: {
          "*": {
            "*": ["*"]
          }
        }
      }
    };
    let result = JSON.parse(compiler.compile(JSON.stringify(input)));
    if (result.contracts) {
      let contract = result.contracts[address][contractName];
      let reCompileByteCode = contract.evm.bytecode.object;
      console.log(reCompileByteCode);
      if (compareByteCode(reCompileByteCode, createByteCode.substr(0, reCompileByteCode.length))) {
        return { result: true, contractName: contractName }
      }
      return { result: false, error: "Difference bytecode" }
    } else {
      this.$alert("Error", "Can't compile");
    }
  }
  catch (e) {
    return { result: false, error: e.message ? e.message : e }

  }
}

function getCompiler(solVersion) {
  return new Promise((resolve, reject) => {
    solc.loadRemoteVersion(solVersion, async (err, solcV) => {
      if (err) {
        return reject(err);
      }
      resolve(solcV.compile)
    })
  })
}

function compareByteCode(a, b) {
  if (a.length != b.length) return false;
  let firstDiffIndex = 0;
  let lastDiffIndex = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      if (firstDiffIndex == 0) firstDiffIndex = i;
      lastDiffIndex = i;
    }
  }
  console.log(firstDiffIndex + " to " + lastDiffIndex);
  return lastDiffIndex - firstDiffIndex <64
  //*
  //KhanhND69 27/10/2018
  //Because Solc in different enviroment have difference metadata
  //Metadata will insert in end of bytecode then difference bytecode
  //Read more here: https://solidity.readthedocs.io/en/v0.5.0/metadata.html
  //*
}
