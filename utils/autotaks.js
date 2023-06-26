const { ethers } = require('ethers');
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require('defender-relay-client/lib/ethers');

exports.handler = async function (data) {
  // Eventos que vienen del sentinel
  // Este evento viene de Sepolia cuando el usuario participa en Airdrop
  const payload = data.request.body.events;

  // Inicializa Proveedor: en este caso es OZP
  const provider = new DefenderRelayProvider(data);

  // Se crea el signer quien será el msg.sender en los smart contracts
  const signer = new DefenderRelaySigner(data, provider, { speed: 'fast' });

  // Filtrando solo eventos
  var onlyEvents = payload[0].matchReasons.filter((e) => e.type === 'event');
  if (onlyEvents.length === 0) return;

  // Filtrando solo DeliverNft
  var event = onlyEvents.filter((ev) => ev.signature.includes('DeliverNft'));
  // Mismos params que en el evento
  var { account, tokens } = event[0].params;

  // Ejecutar 'mint' en Goerli del contrato MiPrimerToken
  var miPrimerTokenAdd = '0x49EF969Aa11665942036f29C882664C67eb25495';
  var tokenAbi = ['function mint(address to, uint256 amount)'];
  var tokenContract = new ethers.Contract(miPrimerTokenAdd, tokenAbi, signer);
  var tx = await tokenContract.mint(account, tokens);
  var res = await tx.wait();
  return res;
};
