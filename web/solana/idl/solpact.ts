/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solpact.json`.
 */
export type Solpact = {
  "address": "8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt",
  "metadata": {
    "name": "solpact",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Project-isolated milestone USDC escrow"
  },
  "instructions": [
    {
      "name": "addMilestone",
      "discriminator": [
        165,
        18,
        177,
        128,
        204,
        172,
        23,
        249
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "milestone",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "i64"
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "approveMilestone",
      "discriminator": [
        145,
        85,
        92,
        60,
        50,
        130,
        219,
        106
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "project"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          },
          "relations": [
            "project"
          ]
        },
        {
          "name": "buyerAta",
          "writable": true
        },
        {
          "name": "sellerAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "cancelProject",
      "discriminator": [
        104,
        149,
        3,
        136,
        160,
        3,
        13,
        132
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claimAutoRelease",
      "discriminator": [
        101,
        138,
        239,
        226,
        27,
        166,
        224,
        70
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "project"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          },
          "relations": [
            "project"
          ]
        },
        {
          "name": "buyerAta",
          "writable": true
        },
        {
          "name": "sellerAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createProject",
      "discriminator": [
        148,
        219,
        181,
        42,
        221,
        114,
        145,
        190
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "arg",
                "path": "projectId"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "projectId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "seller",
          "type": "pubkey"
        },
        {
          "name": "arbitrator",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "expectedMilestones",
          "type": "u8"
        },
        {
          "name": "autoReleaseWindow",
          "type": "i64"
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "project"
          ]
        },
        {
          "name": "buyerAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          },
          "relations": [
            "project"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "finalizeProject",
      "discriminator": [
        161,
        232,
        117,
        5,
        108,
        131,
        145,
        232
      ],
      "accounts": [
        {
          "name": "buyer",
          "signer": true,
          "relations": [
            "project"
          ]
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "raiseDispute",
      "discriminator": [
        41,
        243,
        1,
        51,
        150,
        95,
        246,
        73
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "refundOnDeadlineMiss",
      "discriminator": [
        222,
        214,
        255,
        17,
        243,
        17,
        98,
        205
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "project"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          },
          "relations": [
            "project"
          ]
        },
        {
          "name": "buyerAta",
          "writable": true
        },
        {
          "name": "sellerAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "resolveDispute",
      "discriminator": [
        231,
        6,
        202,
        6,
        96,
        103,
        12,
        230
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        },
        {
          "name": "mint",
          "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          "relations": [
            "project"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "project"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          },
          "relations": [
            "project"
          ]
        },
        {
          "name": "buyerAta",
          "writable": true
        },
        {
          "name": "sellerAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "sellerShareBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "submitDelivery",
      "discriminator": [
        217,
        177,
        33,
        54,
        136,
        185,
        123,
        96
      ],
      "accounts": [
        {
          "name": "actor",
          "signer": true
        },
        {
          "name": "project",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "project.buyer",
                "account": "project"
              },
              {
                "kind": "account",
                "path": "project.project_id",
                "account": "project"
              }
            ]
          },
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "milestone",
      "discriminator": [
        38,
        210,
        239,
        177,
        85,
        184,
        10,
        44
      ]
    },
    {
      "name": "project",
      "discriminator": [
        205,
        168,
        189,
        202,
        181,
        247,
        142,
        19
      ]
    }
  ],
  "events": [
    {
      "name": "deliverySubmitted",
      "discriminator": [
        104,
        47,
        131,
        41,
        20,
        153,
        87,
        75
      ]
    },
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "disputeRaised",
      "discriminator": [
        246,
        167,
        109,
        37,
        142,
        45,
        38,
        176
      ]
    },
    {
      "name": "milestoneAdded",
      "discriminator": [
        25,
        65,
        182,
        178,
        253,
        180,
        118,
        77
      ]
    },
    {
      "name": "milestoneSettled",
      "discriminator": [
        14,
        243,
        90,
        90,
        207,
        201,
        235,
        116
      ]
    },
    {
      "name": "projectCancelled",
      "discriminator": [
        243,
        51,
        59,
        74,
        192,
        234,
        193,
        146
      ]
    },
    {
      "name": "projectCompleted",
      "discriminator": [
        114,
        254,
        117,
        239,
        244,
        178,
        174,
        211
      ]
    },
    {
      "name": "projectCreated",
      "discriminator": [
        192,
        10,
        163,
        29,
        185,
        31,
        67,
        168
      ]
    },
    {
      "name": "projectDrafted",
      "discriminator": [
        87,
        146,
        53,
        148,
        217,
        91,
        63,
        36
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "The signer does not have the required project role"
    },
    {
      "code": 6001,
      "name": "invalidRole",
      "msg": "Invalid buyer, seller or arbitrator"
    },
    {
      "code": 6002,
      "name": "invalidMint",
      "msg": "Unsupported token mint or decimals"
    },
    {
      "code": 6003,
      "name": "invalidRecipient",
      "msg": "Token recipient does not match the project"
    },
    {
      "code": 6004,
      "name": "invalidVault",
      "msg": "Vault does not belong to the project"
    },
    {
      "code": 6005,
      "name": "invalidProjectState",
      "msg": "This action is not allowed in the current project state"
    },
    {
      "code": 6006,
      "name": "invalidMilestoneState",
      "msg": "This action is not allowed in the current milestone state"
    },
    {
      "code": 6007,
      "name": "notFunded",
      "msg": "Project has not been funded or is already completed"
    },
    {
      "code": 6008,
      "name": "invalidIndex",
      "msg": "Milestone index is not the expected index"
    },
    {
      "code": 6009,
      "name": "invalidMilestoneCount",
      "msg": "A project must contain between one and twenty milestones"
    },
    {
      "code": 6010,
      "name": "incompleteProject",
      "msg": "Not all expected milestones have been added"
    },
    {
      "code": 6011,
      "name": "zeroAmount",
      "msg": "Milestone amount must be positive"
    },
    {
      "code": 6012,
      "name": "invalidWindow",
      "msg": "Automatic release window must be between one hour and ninety days"
    },
    {
      "code": 6013,
      "name": "tooEarly",
      "msg": "The automatic release window has not elapsed"
    },
    {
      "code": 6014,
      "name": "deadlinePassed",
      "msg": "The deadline has passed or is invalid for this action"
    },
    {
      "code": 6015,
      "name": "notOverdue",
      "msg": "The delivery deadline has not passed"
    },
    {
      "code": 6016,
      "name": "noArbitrator",
      "msg": "The project does not have an arbitrator"
    },
    {
      "code": 6017,
      "name": "invalidBps",
      "msg": "Seller share must be between zero and ten thousand basis points"
    },
    {
      "code": 6018,
      "name": "textTooLong",
      "msg": "Text exceeds the UTF-8 byte limit"
    },
    {
      "code": 6019,
      "name": "emptyUri",
      "msg": "The delivery URI must not be empty"
    },
    {
      "code": 6020,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow or underflow"
    },
    {
      "code": 6021,
      "name": "invalidAccounting",
      "msg": "Settlement would violate the project accounting invariant"
    },
    {
      "code": 6022,
      "name": "invalidVersion",
      "msg": "Account schema version is unsupported"
    }
  ],
  "types": [
    {
      "name": "deliverySubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "disputeRaised",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "raisedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "milestone",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "sellerPaid",
            "type": "u64"
          },
          {
            "name": "buyerRefunded",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "milestoneStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "deliverableUri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "milestoneAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "milestoneSettled",
      "docs": [
        "One event per settlement, including automatic releases and zero-share awards."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "sellerPaid",
            "type": "u64"
          },
          {
            "name": "buyerRefunded",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "milestoneStatus"
              }
            }
          },
          {
            "name": "reason",
            "type": {
              "defined": {
                "name": "settlementReason"
              }
            }
          }
        ]
      }
    },
    {
      "name": "milestoneStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "submitted"
          },
          {
            "name": "approved"
          },
          {
            "name": "disputed"
          },
          {
            "name": "refunded"
          },
          {
            "name": "resolved"
          }
        ]
      }
    },
    {
      "name": "project",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "arbitrator",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "projectId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "expectedMilestones",
            "type": "u8"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "settledCount",
            "type": "u8"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "settledAmount",
            "type": "u64"
          },
          {
            "name": "sellerPaidAmount",
            "type": "u64"
          },
          {
            "name": "buyerRefundedAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "minDeadline",
            "type": "i64"
          },
          {
            "name": "autoReleaseWindow",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "projectStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "projectCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "projectCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "sellerPaid",
            "type": "u64"
          },
          {
            "name": "buyerRefunded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "projectCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "projectDrafted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "project",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "expectedMilestones",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "projectStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "draft"
          },
          {
            "name": "created"
          },
          {
            "name": "funded"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "settlementReason",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "approval"
          },
          {
            "name": "autoRelease"
          },
          {
            "name": "deadlineRefund"
          },
          {
            "name": "arbitration"
          }
        ]
      }
    }
  ]
};
