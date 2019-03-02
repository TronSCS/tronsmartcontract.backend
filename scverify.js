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

exports.verify = async function (mainnet, address, sourceCode, contractName, solVersion, opmize = true, optimizerRuns = 0, signature = false, createTxHash = false) {
  try {
    if(!signature)
      return { result: false, error: "Creator must sign to verify" }
    //KhanhND Get bytecode of contract at address
    let tronWeb = {}
    if (mainnet) tronWeb = tronWebMainNet
    else tronWeb = tronWebTestNet

    if (!createTxHash) {
      //KhanhND: Try to get create txHash
      let tronDataApi = mainnet ? "https://apilist.tronscan.org/api/contract?contract=" : "https://api.shasta.tronscan.org/api/contract?contract="
      address = address.trim();
      let contractInfo = await axios.get(tronDataApi + address);
      console.log(contractInfo);
      if(contractInfo.data.data[0]==undefined)
        return {result:false, error: "Can't get contract data"}
      if (contractInfo.data.data[0].creator == "")
        return { result: false, error: "Contract don't exits" }
      let creatorAddress= contractInfo.data.data[0].creator.address;
      try{
        await tronWeb.trx.verifyMessage(tronWeb.sha3("I'm creator"),signature,creatorAddress)
      }
      catch(e){
        return { result: false, error: "Just creator can verify, make sure you chose right account to sign" }
      }
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
      if (compareByteCode(reCompileByteCode, createByteCode.substr(0, reCompileByteCode.length))) {
        return { result: true, contractName: contractName }
      }
      return { result: false, error: "Difference bytecode" }
    } else {
      return { result: false, error: "Can't re-compile" }
    }
  }
  catch (e) {
    return { result: false, error: e.message ? e.message : e }

  }
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
  return lastDiffIndex - firstDiffIndex < 64
  //*
  //KhanhND69 27/10/2018
  //Because Solc in different enviroment have difference metadata
  //Metadata will insert in end of bytecode then difference bytecode
  //Read more here: https://solidity.readthedocs.io/en/v0.5.0/metadata.html
  //*
}
