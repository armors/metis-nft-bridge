// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";

// import { IL1NFTBridge } from "../L2/IL1NFTBridge.sol";

contract L2NFTBridge is AccessControl, CrossDomainEnabled {
    
    bytes32 public constant NFT_FACTORY_ROLE = keccak256("NFT_FACTORY_ROLE");

    address public l1NFTBridge;
    address public l2NFTDeposit;
    
    address public addressManager;

    uint256 constant public DEFAULT_CHAINID = 1088;

    function getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
    
    enum nftenum {
        ERC721,
        ERC1155
    }
    
    // L2 nft => L1 nft
    mapping(address => address) public clone;
    // L2 nft => is the original
    mapping(address => bool) public isOriginNFT;

    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    constructor(address _owner, address _nftFactory, address _l2Messenger) CrossDomainEnabled(_l2Messenger) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(NFT_FACTORY_ROLE, _nftFactory);
    }

    function init(address _l2NFTDeposit, address _l1NFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        l2NFTDeposit = _l2NFTDeposit;
        l1NFTBridge = _l1NFTBridge;
    }
    
    function configNFT(address L1NFT, address L2NFT, uint256 originNFTChainId) external virtual onlyFromCrossDomainAccount(l1NFTBridge) {
        clone[L2NFT] = L1NFT;
        uint256 localChainId = getChainID();
        
        isOriginNFT[L2NFT] = false;
        if(localChainId == originNFTChainId){
            isOriginNFT[L2NFT] = true;
        }
    }

    // function depositTo(address nftL2, address to, uint256 id,  nftenum nftStandard, uint32 l2Gas, bytes calldata data) external onlyEOA() {
    //     uint256 amount = 0;

    //    if(nftenum.ERC721 == nftStandard) {
    //         IERC721(nftL2).safeTransferFrom(msg.sender, l2NFTDeposit, id);
    //    }
    //    if(nftenum.ERC1155 == nftStandard) {
    //         amount = IERC1155(nftL2).balanceOf(msg.sender, id);
    //         IERC1155(nftL2).safeTransferFrom(msg.sender, l2NFTDeposit, id, amount, "");
    //    }
        
    //     address nftL1 = cloneL1L2[nftL2];
    //     if(nftL1 == address(0)){
    //         nftL1 = cloneL2L1[nftL2];
    //     }

    //     // _DepositByChainId(DEFAULT_CHAINID, nftL2, nftL1, msg.sender, to, amount, uint8(nftStandard), l2Gas, data)
    // }

    // function _DepositByChainId(uint256 chainId, address nftL2, address nftL1, address from, address to, uint256 amount, uint8 nftStandard, uint32 l2Gas, bytes calldata data) internal {
    
    //     // iMVM_DiscountOracle oracle = iMVM_DiscountOracle(Lib_AddressManager(addressManager).getAddress('MVM_DiscountOracle'));    
    //     // // stack too deep. so no more local variables
    //     // if (l2Gas < uint32(oracle.getMinL2Gas())) {
    //     //     l2Gas = uint32(oracle.getMinL2Gas());
    //     // }
        
    //     // require(l2Gas * oracle.getDiscount() <= msg.value, string(abi.encodePacked("insufficient fee supplied. send at least ", uint2str(l2Gas * oracle.getDiscount()))));
        
    //     // // Construct calldata for finalizeDeposit call
    //     // bytes memory message =  abi.encodeWithSelector(
    //     //     IL1NFTBridge.finalizeDeposit.selector,
    //     //     nft,
    //     //     nftL2,
    //     //     from,
    //     //     to,
    //     //     amount,
    //     //     nftStandard,
    //     //     data
    //     // );
        
    //     // // Send calldata into L2
    //     // sendCrossDomainMessageViaChainId(
    //     //     chainId,
    //     //     l1NFTBridge,
    //     //     l2Gas,
    //     //     message,
    //     //     msg.value  //send all values as fees to cover l2 tx cost
    //     // );
    // }

    // function finalizeDeposit(
    //     address _l1NFT,
    //     address _l2NFT,
    //     address _from,
    //     address _to,
    //     uint256 _amount,
    //     nftenum nftStandard,
    //     bytes calldata _data
    // ) external virtual onlyFromCrossDomainAccount(l1NFTBridge) {
    //     emit DepositFinalized(_l1NFT, _l2NFT, _from, _to, _amount, uint8(nftStandard), _data);
    //     emit DepositFailed(_l1NFT, _l2NFT, _from, _to, _amount, uint8(nftStandard), _data);
    // }

    // function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
    //     if (_i == 0) {
    //         return "0";
    //     }
    //     uint j = _i;
    //     uint len;
    //     while (j != 0) {
    //         len++;
    //         j /= 10;
    //     }
    //     bytes memory bstr = new bytes(len);
    //     uint k = len;
    //     while (_i != 0) {
    //         k = k-1;
    //         uint8 temp = (48 + uint8(_i - _i / 10 * 10));
    //         bytes1 b1 = bytes1(temp);
    //         bstr[k] = b1;
    //         _i /= 10;
    //     }
    //     return string(bstr);
    // }
}
