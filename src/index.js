import { BigNumber, Contract, providers, ethers, utils } from 'ethers';

import usdcTknAbi from '../artifacts/contracts/USDCoin.sol/USDCoin.json';
import miPrimerTknAbi from '../artifacts/contracts/MiPrimerToken.sol/MiPrimerToken.json';
import publicSaleAbi from '../artifacts/contracts/PublicSale.sol/PublicSale.json';
import nftTknAbi from '../artifacts/contracts/NFT.sol/MiPrimerNft.json';

window.ethers = ethers;

var provider, signer, account;
var usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

// REQUIRED
// Conectar con metamask
function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  var usdcAddress;
  var miPrTknAdd;
  var pubSContractAdd;

  usdcTkContract; // = Contract...
  miPrTokenContract; // = Contract...
  pubSContract; // = Contract...
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  var nftAddress;
  nftTknContract = new Contract(
    nftAddress,
    nftTknAbi.abi,
    new providers.JsonRpcProvider(url)
  );
}

function setUpListeners() {
  // Connect to Metamask
  var connectBtn = document.getElementById('connect');

  connectBtn.addEventListener('click', async () => {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      console.log('Billetera metamask', account);

      // provider: Metamask, estamos usando window.ethereum
      provider = new providers.Web3Provider(window.ethereum);
      // signer: el que va a firmar las tx
      signer = provider.getSigner(account);
      window.signer = signer;
    }
  });

  var usdcUpdateBtn = document.getElementById('usdcUpdate');
  usdcUpdateBtn.addEventListener('click', async () => {});

  var miPrimerTknBalanceBtn = document.getElementById('miPrimerTknBalance');
  miPrimerTknBalanceBtn.addEventListener('click', async () => {});

  var approveButtonBtn = document.getElementById('approveButton');
  approveButtonBtn.addEventListener('click', async () => {});

  var purchaseButtonBtn = document.getElementById('purchaseButton');
  purchaseButtonBtn.addEventListener('click', async () => {});

  var purchaseEthButtonBtn = document.getElementById('purchaseEthButton');
  purchaseEthButtonBtn.addEventListener('click', async () => {});

  var sendEtherButtonBtn = document.getElementById('sendEtherButton');
  sendEtherButtonBtn.addEventListener('click', async () => {});
}

function setUpEventsContracts() {
  // nftTknContract.on
}

async function setUp() {
  initSCsGoerli();
  initSCsMumbai();
  await setUpListeners();
  setUpEventsContracts();
}

setUp()
  .then()
  .catch((e) => console.log(e));
