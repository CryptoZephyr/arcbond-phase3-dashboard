// src/lib/arcbond-abi.ts
// On-chain ABI definition for the ArcBond smart contract

export const ARCBOND_ABI = [
    {
        type: "function",
        name: "balances",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "agentIds",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "bondCount",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "jobCount",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "paused",
        inputs: [],
        outputs: [{ type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "protocolFees",
        inputs: [],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getBond",
        inputs: [{ name: "bondId", type: "uint256" }],
        outputs: [
            {
                type: "tuple",
                components: [
                    { name: "initiatorAgentId", type: "uint256" },
                    { name: "counterpartyAgentId", type: "uint256" },
                    { name: "initiator", type: "address" },
                    { name: "counterparty", type: "address" },
                    { name: "collateral", type: "uint256" },
                    { name: "initiatorSplit", type: "uint16" },
                    { name: "counterpartySplit", type: "uint16" },
                    { name: "status", type: "uint8" },
                    { name: "createdAt", type: "uint256" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getJob",
        inputs: [{ name: "jobId", type: "uint256" }],
        outputs: [
            {
                type: "tuple",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "client", type: "address" },
                    { name: "provider", type: "address" },
                    { name: "evaluator", type: "address" },
                    { name: "description", type: "string" },
                    { name: "budget", type: "uint256" },
                    { name: "expiredAt", type: "uint256" },
                    { name: "status", type: "uint8" },
                    { name: "hook", type: "address" },
                    { name: "deliverableHash", type: "bytes32" },
                    { name: "reasonHash", type: "bytes32" },
                    { name: "bondId", type: "uint256" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "reputationOf",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ type: "int256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isAgentActive",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [{ type: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "bindAgentId",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "deposit",
        inputs: [],
        outputs: [],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "withdraw",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "postJob",
        inputs: [
            { name: "provider", type: "address" },
            { name: "evaluator", type: "address" },
            { name: "budget", type: "uint256" },
            { name: "expiredAt", type: "uint256" },
            { name: "description", type: "string" },
            { name: "hook", type: "address" },
            { name: "bondId", type: "uint256" }
        ],
        outputs: [{ name: "jobId", type: "uint256" }],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "approveJob",
        inputs: [{ name: "jobId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "submitDeliverable",
        inputs: [
            { name: "jobId", type: "uint256" },
            { name: "deliverableHash", type: "bytes32" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "completeJob",
        inputs: [
            { name: "jobId", type: "uint256" },
            { name: "reasonHash", type: "bytes32" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "rejectJob",
        inputs: [
            { name: "jobId", type: "uint256" },
            { name: "reasonHash", type: "bytes32" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    // ---- Added missing function ABIs ----
    {
        type: "function",
        name: "createBond",
        inputs: [
            { name: "counterparty", type: "address" },
            { name: "collateral", type: "uint256" },
            { name: "initiatorSplitBPS", type: "uint16" }
        ],
        outputs: [{ name: "bondId", type: "uint256" }],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "approveBond",
        inputs: [{ name: "bondId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "releaseBond",
        inputs: [{ name: "bondId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "slashBond",
        inputs: [
            { name: "bondId", type: "uint256" },
            { name: "slashInitiator", type: "bool" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "raiseDispute",
        inputs: [{ name: "jobId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "arbitrateJob",
        inputs: [
            { name: "jobId", type: "uint256" },
            { name: "providerWins", type: "bool" }
        ],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "expireJob",
        inputs: [{ name: "jobId", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "collectFees",
        inputs: [{ name: "recipient", type: "address" }],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "hasRole",
        inputs: [
            { name: "role", type: "bytes32" },
            { name: "account", type: "address" }
        ],
        outputs: [{ type: "bool" }],
        stateMutability: "view"
    },
    {
        type: "function",
        name: "pause",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
    },
    {
        type: "function",
        name: "unpause",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable"
    },
    // ---- Added missing event ABIs ----
    { type: "event", name: "AgentIdBound", inputs: [{ name: "agent", type: "address", indexed: true }, { name: "agentId", type: "uint256", indexed: true }] },
    { type: "event", name: "Deposited", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
    { type: "event", name: "Withdrawn", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
    { type: "event", name: "BondCreated", inputs: [{ name: "bondId", type: "uint256", indexed: true }, { name: "initiatorAgentId", type: "uint256", indexed: true }, { name: "counterpartyAgentId", type: "uint256", indexed: true }, { name: "collateral", type: "uint256" }, { name: "initiatorSplit", type: "uint16" }, { name: "counterpartySplit", type: "uint16" }] },
    { type: "event", name: "BondApproved", inputs: [{ name: "bondId", type: "uint256", indexed: true }] },
    { type: "event", name: "BondSlashed", inputs: [{ name: "bondId", type: "uint256", indexed: true }, { name: "slashedAgent", type: "address" }, { name: "amount", type: "uint256" }] },
    { type: "event", name: "BondReleased", inputs: [{ name: "bondId", type: "uint256", indexed: true }] },
    { type: "event", name: "JobCreated", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "client", type: "address", indexed: true }, { name: "provider", type: "address", indexed: true }, { name: "evaluator", type: "address" }, { name: "expiredAt", type: "uint256" }, { name: "hook", type: "address" }] },
    { type: "event", name: "JobFunded", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "budget", type: "uint256" }] },
    { type: "event", name: "JobApproved", inputs: [{ name: "jobId", type: "uint256", indexed: true }] },
    { type: "event", name: "DeliverableSubmitted", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "deliverableHash", type: "bytes32" }] },
    { type: "event", name: "JobCompleted", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "reasonHash", type: "bytes32" }, { name: "payout", type: "uint256" }] },
    { type: "event", name: "JobRejected", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "reasonHash", type: "bytes32" }] },
    { type: "event", name: "JobExpired", inputs: [{ name: "jobId", type: "uint256", indexed: true }] },
    { type: "event", name: "JobArbitrated", inputs: [{ name: "jobId", type: "uint256", indexed: true }, { name: "arbitrator", type: "address" }, { name: "providerWins", type: "bool" }] },
    { type: "event", name: "ReputationSynced", inputs: [{ name: "agentId", type: "uint256", indexed: true }, { name: "delta", type: "int256" }, { name: "reason", type: "string" }] },
    { type: "event", name: "FeesCollected", inputs: [{ name: "admin", type: "address", indexed: true }, { name: "amount", type: "uint256" }] }
,
  {
    type: "function",
    name: "grantRole",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;
