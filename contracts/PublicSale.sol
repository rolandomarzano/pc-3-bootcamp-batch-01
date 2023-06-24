// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// Safe Math
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract PublicSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mi Primer Token
    // Crear su setter
    IERC20Upgradeable miPrimerToken;

    // 17 de Junio del 2023 GMT
    uint256 constant startDate = 1686960000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;

    uint256 constant MAX_NFT_SUPPLY = 30;

    uint256 constant PRICE_COMMON_NFT = 500 * 10 ** 18;
    uint256 constant LEGENDARY_PRICE_BASE = 10000 * 10 ** 18;
    uint256 constant LEGENDARY_PRICE_INCREMENT = 1000 * 10 ** 18;

    // Gnosis Safe
    // Crear su setter
    address gnosisSafeWallet;

    event DeliverNft(address winnerAccount, uint256 nftId);

    // Lista de ids vendidos
    mapping(uint256 => bool) private _idsSold;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function setMiPrimerToken(
        address _miPrimerToken
    ) external onlyRole(UPGRADER_ROLE) {
        miPrimerToken = IERC20Upgradeable(_miPrimerToken);
    }

    function setGnosisSafeWallet(
        address _gnosisSafeWallet
    ) external onlyRole(UPGRADER_ROLE) {
        gnosisSafeWallet = _gnosisSafeWallet;
    }

    function purchaseNftById(uint256 _id) external {
        // Realizar 3 validaciones:
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        //         * Mensaje de error: "Public Sale: id not available"
        require(!_idsSold[_id], "Public Sale: id not available");
        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough allowance"
        require(
            miPrimerToken.allowance(msg.sender, address(this)) >=
                _getPriceById(_id),
            "Public Sale: Not enough allowance"
        );
        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough token balance"
        require(
            miPrimerToken.balanceOf(msg.sender) >= _getPriceById(_id),
            "Public Sale: Not enough token balance"
        );
        // 4 - el _id se encuentre entre 1 y 30
        //         * Mensaje de error: "NFT: Token id out of range"
        require(_id > 0 && _id <= MAX_NFT_SUPPLY, "NFT: Token id out of range");

        // Obtener el precio segun el id
        uint256 priceNft = _getPriceById(_id);

        // Purchase fees
        // 10% para Gnosis Safe (fee)
        uint256 fee = priceNft.mul(10).div(100);
        // 90% se quedan en este contrato (net)
        uint256 net = priceNft.sub(fee);
        // from: msg.sender - to: gnosisSafeWallet - amount: fee
        miPrimerToken.transferFrom(msg.sender, gnosisSafeWallet, fee);
        // from: msg.sender - to: address(this) - amount: net
        miPrimerToken.transferFrom(msg.sender, address(this), net);

        // Marcar el id como vendido
        _idsSold[_id] = true;

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, _id);
    }

    function _areNFTsAvailable() internal view returns (bool) {
        for (uint256 i = 1; i <= MAX_NFT_SUPPLY; i++) {
            if (!_idsSold[i]) {
                return true;
            }
        }
        return false;
    }

    function depositEthForARandomNft() public payable {
        // Realizar 2 validaciones
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        require(msg.value >= 0.01 ether, "Public Sale: Not enough ether");
        // 2 - que haya NFTs disponibles para hacer el random
        require(_areNFTsAvailable(), "Public Sale: No more NFTs available");

        // Escgoer una id random de la lista de ids disponibles
        uint256 nftId = _getRandomNftId();

        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        (bool success, ) = gnosisSafeWallet.call{value: msg.value}("");
        require(success, "Public Sale: Ether transfer to Gnosis Safe failed");

        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        uint256 change = msg.value.sub(0.01 ether);
        if (change > 0) {
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
            payable(msg.sender).transfer(change);
        }

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }

    // PENDING
    // Crear el metodo receive
    receive() external payable {
        depositEthForARandomNft();
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    // Devuelve un id random de NFT de una lista de ids disponibles
    function _getRandomNftId() internal view returns (uint256) {}

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id) internal view returns (uint256) {
        // uint256 priceGroupOne;
        // uint256 priceGroupTwo;
        // uint256 priceGroupThree;
        if (_id > 0 && _id < 11) {
            // return priceGroupOne;
            return PRICE_COMMON_NFT;
        } else if (_id > 10 && _id < 21) {
            // return priceGroupTwo;
            return _id.mul(LEGENDARY_PRICE_INCREMENT);
        } else {
            // return priceGroupThree;
            uint256 hoursPassed = block.timestamp.sub(startDate).div(1 hours);
            uint256 legendaryPrice = LEGENDARY_PRICE_BASE.add(
                hoursPassed.mul(LEGENDARY_PRICE_INCREMENT)
            );
            return
                legendaryPrice <= MAX_PRICE_NFT
                    ? legendaryPrice
                    : MAX_PRICE_NFT;
        }
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
