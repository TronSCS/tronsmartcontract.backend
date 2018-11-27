const solc = require('solc');
const TronWeb = require('tronweb');


const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';
const fullNodeTestNet = 'https://api.shasta.trongrid.io';
const solidityNodeTestNet = 'https://api.shasta.trongrid.io';
const eventServerTestNet = 'https://api.shasta.trongrid.io';

const tronWebMainNet = new TronWeb(fullNode, solidityNode, eventServer, "143100215d5e872541219dd03b9580c853e81f73b8bd6a6c21d20fb9160ae0cd");
const tronWebTestNet = new TronWeb(fullNodeTestNet, solidityNodeTestNet, eventServerTestNet, "143100215d5e872541219dd03b9580c853e81f73b8bd6a6c21d20fb9160ae0cd");

exports.verify = async function(mainnet, address, sourceCode, contractName,params, solVersion, opmize) {
  try {
    //KhanhND Get bytecode of contract at address
    let tronWeb = {}
    if (mainnet) tronWeb = tronWebMainNet
    else tronWeb = tronWebTestNet
    let contractInstance = await tronWeb.trx.getContract(address)
    let deployedByteCode = contractInstance.bytecode

    //KhanhND Compile
    let compiler = await getCompiler(solVersion);
    const compiled = compiler({sources:{'hi':sourceCode},settings:{optimizer: {enabled: true, runs:0}}},1);
    if (!compiled.errors) {
        const unsigned = await tronWeb.transactionBuilder.createSmartContract({
          abi: compiled.contracts["hi:"+contractName].interface,
          bytecode: compiled.contracts["hi:"+contractName].bytecode,
          parameters: params
        });
        let bytecode = unsigned.raw_data.contract[0].parameter.value.new_contract.bytecode
        if (compareByteCode(bytecode,deployedByteCode)) return { result: true, contractName: contractName }
    }
    else {
      return { result: false, error: compiled.errors }
    }
  }
  catch (e) {
    return { result: false, error: e }

  }
}

function getCompiler(solVersion) {
  return new Promise((resolve, reject) => {
      solc.loadRemoteVersion(solVersion, async(err, solcV) => {
        if (err) {
          return reject(err);
        }
        resolve(solcV.compile)
      })
    })
  }

function compareByteCode(a,b) {
  if(a.length!=b.length) return false;
  let firstDiffIndex=0;
  let lastDiffIndex=0;
  for(let i=0;i<a.length;i++){
    if(a[i]!=b[i]){
      if(firstDiffIndex==0) firstDiffIndex=i;
      lastDiffIndex=i;
    }
  }
  return lastDiffIndex-firstDiffIndex==63
  //*
  //KhanhND69 27/10/2018
  //Because Solc in different enviroment have difference metadata
  //Metadata will insert in end of bytecode then difference bytecode
  //Read more here: https://solidity.readthedocs.io/en/v0.5.0/metadata.html
  //*
}
