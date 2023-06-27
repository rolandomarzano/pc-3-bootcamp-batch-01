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

  var usdcAddress = '0x8D301a8c73Fdb0317945EB96D1E1a78701977D8d';
  var miPrTknAdd = '0x72E85f215FF880Ed80bD0a72141461D32961A327';
  var pubSContractAdd = '0x958F8B1Eb4eA71520bb753d20cCd07D566a3aEA3';

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi.abi, provider);
  miPrTokenContract = new Contract(miPrTknAdd, miPrimerTknAbi.abi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi.abi, provider);
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  var urlProvider =
    'https://polygon-mumbai.g.alchemy.com/v2/G4-y-BXRg4lnQIPRzoKQLOJyh1joSAue';
  provider = new providers.JsonRpcProvider(urlProvider);

  var nftAddress = '0xAFEee7076fa51784f8cFA8A04F25272Cc3f99172';
  nftTknContract = new Contract(nftAddress, nftTknAbi.abi, provider);
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

      // Setteo de usdc disponibles
      SetBalanceUsdc();

      // Setteo de miPrimerTkn disponibles
      SetBalanceMiPrimerTkn();
    }
  });

  async function SetBalanceUsdc() {
    var balanceOfUsdc = await usdcTkContract.connect(signer).balanceOf(account);
    var amount = BigNumber.from(balanceOfUsdc).div(BigNumber.from(10).pow(6));
    document.getElementById('usdcBalance').textContent = amount.toString();
  }

  async function SetBalanceMiPrimerTkn() {
    var balanceOfMiPrimerTkn = await miPrTokenContract
      .connect(signer)
      .balanceOf(account);
    var amount = BigNumber.from(balanceOfMiPrimerTkn).div(
      BigNumber.from(10).pow(18)
    );
    document.getElementById('miPrimerTknBalance').textContent =
      amount.toString();
  }

  var switchBtn = document.getElementById('switch');
  switchBtn.addEventListener('click', async () => {
    if (window.ethereum) {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [
          {
            chainId: utils.hexValue(Number('80001')),
            chainName: 'Mumbai (Polygon) Testnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: [
              'https://polygon-mumbai.g.alchemy.com/v2/G4-y-BXRg4lnQIPRzoKQLOJyh1joSAue',
            ],
            blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
          },
        ],
      });
    } else {
      console.log('No metamask installed');
    }
  });

  var usdcUpdateBtn = document.getElementById('usdcUpdate');
  usdcUpdateBtn.addEventListener('click', async () => {
    SetBalanceUsdc();
  });

  var miPrimerTknBalanceBtn = document.getElementById('miPrimerTknBalance');
  miPrimerTknBalanceBtn.addEventListener('click', async () => {
    SetBalanceMiPrimerTkn();
  });

  var approveButtonBtn = document.getElementById('approveButton');
  approveButtonBtn.addEventListener('click', async () => {
    var approveInputAmount = document.getElementById('approveInput').value;
    var amountWei = utils.parseEther(
      approveInputAmount === '' ? '0' : approveInputAmount
    );

    var approveErrorSpan = document.getElementById('approveError');
    approveErrorSpan.innerHTML = '';

    if (amountWei.gt(await miPrTokenContract.balanceOf(account))) {
      approveErrorSpan.textContent = 'Not enough balance';
      return;
    }

    try {
      const tx = await miPrTokenContract
        .connect(signer)
        .approve(pubSContract.address, amountWei);

      const response = await tx.wait();

      console.log('Transaction aprove:', response.transactionHash);
    } catch (e) {
      approveErrorSpan.textContent = e.message;
    }
  });

  var purchaseButtonBtn = document.getElementById('purchaseButton');
  purchaseButtonBtn.addEventListener('click', async () => {
    var purchaseInputNft = document.getElementById('purchaseInput').value;

    var purchaseErrorSpan = document.getElementById('purchaseError');
    purchaseErrorSpan.innerHTML = '';

    try {
      const tx = await pubSContract
        .connect(signer)
        .purchaseNftById(purchaseInputNft);

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      purchaseErrorSpan.textContent = e.message;
    }
  });

  var purchaseEthButtonBtn = document.getElementById('purchaseEthButton');
  purchaseEthButtonBtn.addEventListener('click', async () => {
    try {
      const tx = await pubSContract.connect(signer).depositEthForARandomNft({
        gasLimit: ethers.utils.hexlify(1200000),
        value: utils.parseEther('0.01'),
      });

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById('purchaseEthError').textContent = e.message;
    }
  });

  var sendEtherButtonBtn = document.getElementById('sendEtherButton');
  sendEtherButtonBtn.addEventListener('click', async () => {
    try {
      const payload = {
        to: pubSContract.address,
        gasLimit: ethers.utils.hexlify(1200000),
        value: utils.parseEther('0.01'),
      };

      const tx = await signer.sendTransaction(payload);

      const response = await tx.wait();

      console.log('Transaction:', response.transactionHash);
    } catch (e) {
      document.getElementById('sendEtherError').textContent = e.message;
    }
  });
}

function setUpEventsContracts() {
  // nftTknContract.on
  var nftListDiv = document.getElementById('nftList');
  nftTknContract.on('Transfer', (from, to, tokenId) => {
    nftListDiv.innerHTML += `<li>Transfer from: ${from} to ${to} | Token ID: ${tokenId}</li>`;
  });
}

async function setUp() {
  initSCsGoerli();
  initSCsMumbai();
  setUpListeners();
  setUpEventsContracts();
}

setUp()
  .then()
  .catch((e) => console.log(e));
