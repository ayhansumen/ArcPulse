// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract Escrow {
    enum State { Pending, Completed, Refunded, Disputed }

    struct Payment {
        address sender;
        address recipient;
        address arbiter;
        address token;
        uint256 amount;
        State state;
        string description;
    }

    mapping(uint256 => Payment) public payments;
    uint256 public paymentCount;

    event PaymentCreated(uint256 indexed id, address sender, address recipient, uint256 amount, address token, string description);
    event PaymentCompleted(uint256 indexed id);
    event PaymentRefunded(uint256 indexed id);
    event PaymentDisputed(uint256 indexed id);

    function createPayment(
        address recipient,
        address arbiter,
        address token,
        uint256 amount,
        string calldata description
    ) external returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 id = paymentCount++;
        payments[id] = Payment({
            sender: msg.sender,
            recipient: recipient,
            arbiter: arbiter == address(0) ? msg.sender : arbiter,
            token: token,
            amount: amount,
            state: State.Pending,
            description: description
        });

        emit PaymentCreated(id, msg.sender, recipient, amount, token, description);
        return id;
    }

    function getPayment(uint256 id) external view returns (Payment memory) {
        return payments[id];
    }

    function approvePayment(uint256 id) external {
        Payment storage p = payments[id];
        require(p.state == State.Pending || p.state == State.Disputed, "Not actionable");
        require(msg.sender == p.sender || msg.sender == p.arbiter, "Not authorized");

        p.state = State.Completed;
        IERC20(p.token).transfer(p.recipient, p.amount);
        emit PaymentCompleted(id);
    }

    function refundPayment(uint256 id) external {
        Payment storage p = payments[id];
        require(p.state == State.Pending || p.state == State.Disputed, "Not actionable");
        require(msg.sender == p.arbiter || msg.sender == p.sender, "Not authorized");

        p.state = State.Refunded;
        IERC20(p.token).transfer(p.sender, p.amount);
        emit PaymentRefunded(id);
    }

    function disputePayment(uint256 id) external {
        Payment storage p = payments[id];
        require(p.state == State.Pending, "Not pending");
        require(msg.sender == p.sender || msg.sender == p.recipient, "Not authorized");

        p.state = State.Disputed;
        emit PaymentDisputed(id);
    }
}