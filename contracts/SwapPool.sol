// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SwapPool {
    address public owner;
    address public USDC;
    address public EURC;
    uint256 public constant FEE_BPS = 30;

    event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _usdc, address _eurc) {
        owner = msg.sender;
        USDC = _usdc;
        EURC = _eurc;
    }

    function getPoolBalances() external view returns (uint256, uint256) {
        return (IERC20(USDC).balanceOf(address(this)), IERC20(EURC).balanceOf(address(this)));
    }

    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256) {
        require(tokenIn == USDC || tokenIn == EURC, "Invalid token");
        uint256 fee = (amountIn * FEE_BPS) / 10000;
        uint256 amountAfterFee = amountIn - fee;
        address tokenOut = tokenIn == USDC ? EURC : USDC;
        require(IERC20(tokenOut).balanceOf(address(this)) >= amountAfterFee, "Insufficient liquidity");
        return amountAfterFee;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Same token");
        amountOut = getAmountOut(tokenIn, amountIn);
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function addLiquidity(address token, uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
}
