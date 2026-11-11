window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "agent.durable": {
   "checkpoints_for_the_thread_while_paused": 3,
   "refunds_after_resume_in_a_new_graph_object": 1,
   "store": "SQLite file through langgraph-checkpoint-sqlite",
   "tables": [
    "checkpoints",
    "writes"
   ]
  },
  "agent.interrupt": {
   "next_node_while_paused": [
    "tools"
   ],
   "payload": [
    {
     "args": {
      "amount": 12.5,
      "order_id": "ORD-2026-0412"
     },
     "question": "Approve this write?",
     "tool": "issue_refund"
    }
   ],
   "refunds_after_approve": 1,
   "refunds_after_deny": 0,
   "refunds_before_resume": 0
  },
  "agent.limits": {
   "langgraph": "1.2.20",
   "our_limit": 6,
   "recursion_error": "Recursion limit of 10 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.",
   "recursion_limit_used": 10
  },
  "agent.replay": {
   "checkpoints": 7,
   "final_messages": 6,
   "replayed_from": {
    "model_calls": 1,
    "next": [
     "tools"
    ]
   },
   "tools_run_again": {
    "orders_by_status": 1,
    "search_policies": 1
   }
  },
  "agent.resume_runs_again": {
   "explanation": "on resume the node starts again from its first line. The read tool before the interrupt ran a second time.",
   "tool_calls_after_resume": {
    "issue_refund": 1,
    "search_policies": 2
   },
   "tool_calls_before_resume": {
    "search_policies": 1
   }
  },
  "agent.traces": {
   "A": [
    [
     "model",
     "call search_policies(query='return beans refund window')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call orders_by_status(status='COMPLETED')"
    ],
    [
     "tools",
     "orders_by_status ok: 120"
    ],
    [
     "model",
     "answer: Customers have 14 days (handbook v2). 120 orders are completed."
    ]
   ],
   "B": [
    [
     "model",
     "call orders_by_status(status='done')"
    ],
    [
     "tools",
     "orders_by_status ERROR: unknown status 'done'. allowed: COMPLETED, CANCELLED, PENDING"
    ],
    [
     "model",
     "call orders_by_status(status='COMPLETED')"
    ],
    [
     "tools",
     "orders_by_status ok: 120"
    ],
    [
     "model",
     "answer: 120 orders are completed."
    ]
   ],
   "C": [
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "tools",
     "search_policies ok: [\"# Glossary\\n\\nWords that the staff and the customers use for the same thing.\\n\\n## Money"
    ],
    [
     "model",
     "call search_policies(query='refund')"
    ],
    [
     "give_up",
     "answer: I stopped after 6 steps without an answer."
    ]
   ],
   "D": [
    [
     "model",
     "call issue_refund(order_id='ORD-2026-0412', amount=12.5)"
    ],
    [
     "interrupt",
     "paused: {\"tool\": \"issue_refund\", \"args\": {\"order_id\": \"ORD-2026-0412\", \"amount\": 12.5}, \"question\": \"Approve this write?\"}"
    ],
    [
     "tools",
     "issue_refund ok: refunded 12.50 on ORD-2026-0412"
    ],
    [
     "model",
     "answer: Done: refunded 12.50 on ORD-2026-0412"
    ]
   ],
   "D_denied": [
    [
     "model",
     "call issue_refund(order_id='ORD-2026-0412', amount=12.5)"
    ],
    [
     "interrupt",
     "paused: {\"tool\": \"issue_refund\", \"args\": {\"order_id\": \"ORD-2026-0412\", \"amount\": 12.5}, \"question\": \"Approve this write?\"}"
    ],
    [
     "tools",
     "issue_refund ERROR: the approver said no"
    ],
    [
     "model",
     "answer: Done: the approver said no"
    ]
   ]
  },
  "agent.workflow_vs_agent": {
   "agent": {
    "model_calls": 3,
    "repeatable": false,
    "steps_decided_by": "the model",
    "tool_calls": 2
   },
   "note": "both give the same answer here. The workflow asks the model once, to write the answer. The agent asks it three times, to choose each step and to write the answer.",
   "workflow": {
    "model_calls": 1,
    "repeatable": true,
    "steps_decided_by": "the code",
    "tool_calls": 2
   }
  },
  "ann.build": {
   "note": "time depends on the machine and is not compared between recordings",
   "seconds_hnsw_m16": 1.74
  },
  "ann.data": {
   "bytes_float32": 7680000,
   "clusters": 40,
   "dimensions": 64,
   "note": "made-up Gaussian clusters, unit length, so cosine is the dot product",
   "queries": 200,
   "vectors": 30000
  },
  "ann.delete": {
   "deleted_label": 7728,
   "elements_after_mark_deleted": 30000,
   "elements_before": 30000,
   "library": "hnswlib 0.8.0",
   "note": "the element is hidden from results, but it stays in the graph and in memory until the index is rebuilt",
   "results_after": [
    3937,
    7377,
    29974,
    11874,
    19437
   ],
   "results_before": [
    7728,
    3937,
    7377,
    29974,
    11874
   ],
   "still_in_results_after_delete": false
  },
  "chunk.sample": {
   "chunks": [
    "Supplier terms Andes Roasters Questions about this section go to the operations team. Andes Roasters delivers beans every Tuesday and Friday with a lead time of 3 days and a minimum order of 40 kg. A late delivery from Andes Roasters carries a penalty of 2 percent of the invoice for each day, capped at 10 percent. New staff read this section in their first week. Photos of the display shelf are checked on Mondays",
    "Supplier Delivers Lead time Minimum order Andes Roasters Tue, Fri 3 days 40 kg Hillside Dairy every day 1 day 60 litres Paper Lane Mon 7 days 5 boxes\n\nHillside Dairy Lists of store contacts are kept at the till. The area manager reviews these rules once a year. Hillside Dairy delivers milk every day before 06:00, and a missed delivery must be reported before 08:00 to claim a credit. Keep a copy of this page in the back office. Ask your shift lead if anything in this section is unclear."
   ],
   "count": 2,
   "doc": "supplier-terms.pdf"
  },
  "chunk.split_example": {
   "cut_inside_phrase": true,
   "document": "runbook",
   "end_of_first_chunk": " alarm, evacuate through the front door and meet at the asse",
   "fact": "r02",
   "key_phrase": "assembly point by the bus stop",
   "offset": 496,
   "start_of_next_chunk": "mbly point by the bus stop. Questions about this section go "
  },
  "chunk.stats": {
   "by heading, up to 500": {
    "bm25_hit@3": 0.833,
    "chunks": 181,
    "ends_mid_sentence_pct": 2,
    "facts_intact": 27,
    "facts_total": 27,
    "hybrid_hit@3": 0.833,
    "hybrid_hit@5": 0.875,
    "mean_chars": 177,
    "p95_chars": 386,
    "vec_hit@3": 0.792
   },
   "fixed 500, no overlap": {
    "bm25_hit@3": 0.708,
    "chunks": 81,
    "ends_mid_sentence_pct": 28,
    "facts_intact": 26,
    "facts_total": 27,
    "hybrid_hit@3": 0.75,
    "hybrid_hit@5": 0.75,
    "mean_chars": 425,
    "p95_chars": 500,
    "vec_hit@3": 0.75
   },
   "fixed 500, overlap 100": {
    "bm25_hit@3": 0.833,
    "chunks": 129,
    "ends_mid_sentence_pct": 19,
    "facts_intact": 27,
    "facts_total": 27,
    "hybrid_hit@3": 0.833,
    "hybrid_hit@5": 0.917,
    "mean_chars": 307,
    "p95_chars": 500,
    "vec_hit@3": 0.833
   },
   "recursive 500": {
    "bm25_hit@3": 0.875,
    "chunks": 87,
    "ends_mid_sentence_pct": 9,
    "facts_intact": 27,
    "facts_total": 27,
    "hybrid_hit@3": 0.875,
    "hybrid_hit@5": 0.875,
    "mean_chars": 395,
    "p95_chars": 484,
    "vec_hit@3": 0.792
   },
   "whole sentences up to 500": {
    "bm25_hit@3": 0.833,
    "chunks": 82,
    "ends_mid_sentence_pct": 0,
    "facts_intact": 27,
    "facts_total": 27,
    "hybrid_hit@3": 0.833,
    "hybrid_hit@5": 0.875,
    "mean_chars": 414,
    "p95_chars": 482,
    "vec_hit@3": 0.833
   }
  },
  "docs.docx": {
   "headings": 4,
   "markdown_excerpt": "# Leave policy\n\n## Annual leave\n\nQuestions about this section go to the operations team. Employees receive 25 days of paid leave a year, and leave must be requested at least 14 days ahead. New staff read this section in their first week. Photos of the display shelf are checked on Mondays.\n\n## Sick leave\n\nPlease keep the work area tidy and the counters clear. Sick leave needs a doctor's note from the third consecutive",
   "table_rows": 3
  },
  "docs.html": {
   "boilerplate_in_markdown": [],
   "boilerplate_in_naive": [
    "Home | Menu | Stores | Careers",
    "All rights reserved"
   ],
   "markdown": "# Menu and allergens\n\n## Allergens\n\nReport broken equipment to the maintenance team the same day. Training videos for this topic are on the staff portal. The pistachio cold brew contains tree nuts and is made on shared equipment. Write down anything unusual in the shift log. Questions about this section go to the operations team.\n\n| Drink | Contains | May contain |\n\n| Latte | milk | none |\n\n| Oat flat white | oats | gluten |\n\n| Almond croissant | tree nuts, gluten, milk, eggs | sesame |\n\n| Pistachio cold brew | tree nuts | milk |\n\n| Matcha latte | milk | none |",
   "markdown_words": 110,
   "naive_excerpt": "Menu and allergens Home | Menu | Stores | Careers Menu and allergens Allergens Report broken equipment to the maintenance team the same day. Training videos for this topic are on the staff portal. The pistachio cold brew contains tree nuts and is made on shared equipment. Write down anything unusual in the shift log. Questions a",
   "naive_words": 99
  },
  "docs.lsh": {
   "num_perm": 128,
   "shingle_words": 5,
   "sweep": [
    {
     "pairs": [
      [
       "equipment",
       "runbook"
      ],
      [
       "handbook-v1",
       "handbook-v2"
      ]
     ],
     "threshold": 0.3
    },
    {
     "pairs": [
      [
       "handbook-v1",
       "handbook-v2"
      ]
     ],
     "threshold": 0.5
    },
    {
     "pairs": [
      [
       "handbook-v1",
       "handbook-v2"
      ]
     ],
     "threshold": 0.7
    },
    {
     "pairs": [],
     "threshold": 0.9
    }
   ],
   "v1_v2_differ_in": [
    "within 14 days of purchase / within 30 days of purchase",
    "above EUR 50 / above EUR 100"
   ]
  },
  "docs.pdf": {
   "chars_after_clean": 3423,
   "chars_before_clean": 3865,
   "chars_per_page": [
    532,
    436,
    350,
    587,
    400,
    442,
    423,
    372,
    315
   ],
   "file": "store-handbook-v2.pdf",
   "has_heading_marks": false,
   "header_copies_if_kept": 9,
   "page_footer_example": "Page 2 of 9",
   "pages": 9,
   "repeated_lines": [
    "Brewline Store Handbook v2 - Internal"
   ],
   "table_as_extracted": [
    "Store Mon to Fri Sat Sun",
    "Amsterdam Central 07:00 to 19:00 08:00 to 18:00 09:00 to 17:00",
    "Rotterdam Station 06:30 to 20:00 08:00 to 19:00 closed",
    "Utrecht Canal 07:30 to 18:00 08:30 to 17:00 10:00 to 16:00"
   ],
   "table_page": 4
  },
  "docs.pii": {
   "found": {
    "email": 2,
    "iban": 1,
    "phone": 2
   },
   "loose_pattern_hits": [
    "+31 6 1234 5678",
    "+31 6 8765 4321",
    "0417164300",
    "-2026-0412"
   ],
   "masked": "Meeting notes, 12 March 2026\nPresent: Maria Santos, Kenji Mori, and the three store leads.\nMaria Santos can be reached at [EMAIL] or [PHONE]. Kenji Mori can be reached at [EMAIL] or [PHONE].\n\nAgenda\n1. Summer menu. The pistachio cold brew sells well and stays on the menu.\n2. Milk prices. Decision: raise the milk alternative surcharge from EUR 0.40 to EUR 0.50 from 1 May.\n3. Payroll. The tip payout for February is paid to the account [IBAN]. Order references such as ORD-2026-0412 and SKU-4471 are not personal data.\n4. Next meeting on 9 April. Please keep the area tidy and ask your shift lead if anything is unclear.\n",
   "names_in_text": [
    "Maria Santos",
    "Kenji Mori"
   ],
   "names_masked_by_patterns": [
    "Maria Santos",
    "Kenji Mori"
   ],
   "order_refs_untouched": true
  },
  "docs.scanned": {
   "chars_extracted": 0,
   "file": "delivery-note-scan.pdf",
   "images_on_page": 1,
   "pages": 1
  },
  "docs.set": {
   "audiences": [
    "all-staff",
    "finance",
    "hr",
    "managers"
   ],
   "core": 13,
   "documents": 59,
   "extra": 46,
   "facts": 29,
   "formats": [
    "pdf",
    "docx",
    "html",
    "md",
    "txt"
   ],
   "questions": 24
  },
  "docs.versions": {
   "only_in_v1": [
    "A customer may return an unused drink voucher or a sealed bag of beans within 30 days of purchase with a receipt.",
    "A refund above EUR 100 needs a second manager to approve it in the till."
   ],
   "only_in_v2": [
    "A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.",
    "A refund above EUR 50 needs a second manager to approve it in the till."
   ],
   "shared_sentences": 8
  },
  "embed.metrics": {
   "questions": 24,
   "same_top10_for_cosine_dot_and_l2": 24
  },
  "embed.model": {
   "bytes_float32": 22272,
   "chunks": 87,
   "dim": 64,
   "explained_variance": 0.899,
   "kind": "TF-IDF followed by a truncated SVD (a stand-in, not a neural model)",
   "unit_length": true,
   "vocabulary": 2201
  },
  "embed.nearest": {
   "items": [
    {
     "kind": "meaning",
     "qid": "q09",
     "question": "Can a shopper get reimbursed for beans they have not opened?",
     "top3": [
      [
       "barista-training:2",
       0.584,
       "no"
      ],
      [
       "glossary:0",
       0.571,
       "no"
      ],
      [
       "marketing-calendar:0",
       0.362,
       "no"
      ]
     ]
    },
    {
     "kind": "meaning",
     "qid": "q10",
     "question": "What should the team do if electricity is cut for a long time?",
     "top3": [
      [
       "runbook:0",
       0.714,
       "relevant"
      ],
      [
       "glossary:1",
       0.685,
       "no"
      ],
      [
       "faq:0",
       0.518,
       "no"
      ]
     ]
    },
    {
     "kind": "number",
     "qid": "q17",
     "question": "What is the price of a large oat flat white?",
     "top3": [
      [
       "prices:0",
       0.824,
       "relevant"
      ],
      [
       "barista-training:1",
       0.5,
       "no"
      ],
      [
       "faq:2",
       0.471,
       "no"
      ]
     ]
    }
   ]
  },
  "embed.neighbors": {
   "electricity": [
    [
     "app",
     1.0
    ],
    [
     "being",
     1.0
    ],
    [
     "blackout",
     1.0
    ],
    [
     "different",
     1.0
    ],
    [
     "early",
     1.0
    ]
   ],
   "refund": [
    [
     "unused",
     1.0
    ],
    [
     "voucher",
     1.0
    ],
    [
     "return",
     0.959
    ],
    [
     "sealed",
     0.893
    ],
    [
     "returned",
     0.732
    ]
   ],
   "roaster": [
    [
     "agreed",
     1.0
    ],
    [
     "check",
     1.0
    ],
    [
     "counting",
     1.0
    ],
    [
     "late",
     0.875
    ],
    [
     "holds",
     0.801
    ]
   ],
   "tips": [
    [
     "shared",
     0.939
    ],
    [
     "each",
     0.843
    ],
    [
     "code",
     0.787
    ],
    [
     "cash",
     0.768
    ],
    [
     "changed",
     0.76
    ]
   ]
  },
  "embed.quantize": {
   "16": {
    "bytes_per_vector": 128,
    "hit@5": 0.875
   },
   "32": {
    "bytes_per_vector": 256,
    "hit@5": 0.875
   },
   "8": {
    "bytes_per_vector": 64,
    "hit@5": 0.875
   }
  },
  "embed.versions": {
   "new_model_new_index_hit@5": 0.875,
   "new_query_old_index_other_dimension": "matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 48 is different from 64)",
   "new_query_old_index_same_dimension_hit@5": 0.917,
   "old_model_old_index_hit@5": 0.875
  },
  "finetune.dataset": {
   "after_adding_repeats": 186,
   "after_exact_dedup": 162,
   "after_near_dedup": 161,
   "facts": 27,
   "generated": 162,
   "repeats_added": 14,
   "spacing_variants_added": 10,
   "words_per_example_max": 40,
   "words_per_example_mean": 25.5
  },
  "inject.note": {
   "model": "a stand-in that obeys the injected sentence. It says nothing about whether a real model would. It shows what the rest of the system does either way."
  },
  "inject.retrieval": {
   "chunks": 88,
   "poisoned_chunk_rank": 1,
   "question": "What is the refund policy for returning beans?",
   "right_chunk_rank_without_it": 2,
   "why": "the injected text repeats the words of the question, so keyword search puts it first. Retrieval has no idea that the text is an order."
  },
  "llm.constants": {
   "anthropic": {
    "initial_retry_delay": 0.5,
    "max_retries": 2,
    "max_retry_delay": 8.0,
    "timeout": "Timeout(connect=5.0, read=600, write=600, pool=600)",
    "version": "2.8.0"
   },
   "openai": {
    "initial_retry_delay": 0.5,
    "max_retries": 2,
    "max_retry_delay": 8.0,
    "timeout": "Timeout(connect=5.0, read=600, write=600, pool=600)",
    "version": "3.49.0"
   }
  },
  "llm.stream": {
   "anthropic_event_runs": [
    [
     "message_start",
     1
    ],
    [
     "content_block_start",
     1
    ],
    [
     "content_block_delta",
     1
    ],
    [
     "text",
     1
    ],
    [
     "content_block_delta",
     1
    ],
    [
     "text",
     1
    ],
    [
     "content_block_delta",
     1
    ],
    [
     "text",
     1
    ],
    [
     "content_block_delta",
     1
    ],
    [
     "text",
     1
    ],
    [
     "content_block_stop",
     1
    ],
    [
     "message_delta",
     1
    ],
    [
     "message_stop",
     1
    ]
   ],
   "anthropic_event_types": [
    "message_start",
    "content_block_start",
    "content_block_delta",
    "text",
    "content_block_delta",
    "text",
    "content_block_delta",
    "text",
    "content_block_delta",
    "text",
    "content_block_stop",
    "message_delta",
    "message_stop"
   ],
   "anthropic_text": "A refund is possible within 14 days.",
   "anthropic_usage": {
    "input": 21,
    "output": 8
   },
   "note": "the stand-in sends the pieces that the script gave it, so the number of events is set by the script. The order and the names of the events are the real protocol.",
   "openai_chunks": 5,
   "openai_last_finish_reason": "stop",
   "openai_text": "A refund is possible within 14 days."
  },
  "llm.structured": {
   "checks": [
    {
     "error": "",
     "text": "{\"order_id\": \"ORD-2026-0412\", \"approve\": true, \"reason\": \"inside the 1",
     "valid": true
    },
    {
     "error": "approve: Input should be a valid boolean, unable to interpret input | reason: Field required",
     "text": "{\"order_id\": \"ORD-2026-0412\", \"approve\": \"maybe\"}",
     "valid": false
    },
    {
     "error": "the text: Invalid JSON: expected value at line 1 column 1",
     "text": "Sure! Here is the JSON you asked for: {\"order_id\": \"ORD-2026-0412\", \"a...",
     "valid": false
    }
   ],
   "schema": {
    "properties": {
     "approve": {
      "title": "Approve",
      "type": "boolean"
     },
     "order_id": {
      "title": "Order Id",
      "type": "string"
     },
     "reason": {
      "maxLength": 120,
      "title": "Reason",
      "type": "string"
     }
    },
    "required": [
     "order_id",
     "approve",
     "reason"
    ],
    "title": "RefundDecision",
    "type": "object"
   }
  },
  "llm.tools": {
   "final_text": "Within 14 days.",
   "request_1_keys": [
    "max_tokens",
    "messages",
    "model",
    "tools"
   ],
   "request_1_tools": [
    {
     "description": "Find Brewline policy sentences.",
     "input_schema": {
      "properties": {
       "limit": {
        "type": "integer"
       },
       "query": {
        "type": "string"
       }
      },
      "required": [
       "query"
      ],
      "type": "object"
     },
     "name": "search_policies"
    }
   ],
   "request_2_block_types": [
    "text",
    [
     "tool_use"
    ],
    [
     "tool_result"
    ]
   ],
   "request_2_roles": [
    "user",
    "assistant",
    "user"
   ],
   "request_2_tool_use_id_matches": true,
   "requests_sent": 2,
   "response_block": {
    "id": "toolu_01",
    "input": {
     "query": "refund window"
    },
    "name": "search_policies",
    "type": "tool_use"
   },
   "response_stop_reason": "tool_use"
  },
  "mcp.footprint": {
   "chars_per_tool": 511,
   "json_chars_of_tool_definitions": 1533,
   "rule_of_thumb_chars_per_token": 4,
   "tokens_for_40_such_tools": 5110,
   "tokens_for_these_tools": 383,
   "tools": 3
  },
  "mcp.session": {
   "call_bad_argument": {
    "is_error": true,
    "text": "Error executing tool orders_by_status: 1 validation error for orders_by_statusArguments\nstatus\n  Input should be 'COMPLETED', 'CANCELLED' or 'PENDING' [type=literal_error, input_value='SHIPPED', input"
   },
   "call_ok": {
    "is_error": false,
    "text": "{\"status\": \"COMPLETED\",\"orders\": 144}"
   },
   "call_tool_error": {
    "is_error": true,
    "text": "Error executing tool issue_refund"
   },
   "call_unknown": {
    "is_error": true,
    "text": "Unknown tool: no_such_tool"
   },
   "prompts": [
    "triage_order"
   ],
   "protocol_version": "2026-07-28",
   "resource_text": "orders(order_id int, store_id int, status text, total_eur decimal, placed_at date)",
   "resources": [
    "brewline://schema/orders"
   ],
   "server_info": {
    "name": "brewline-data",
    "version": ""
   },
   "tools": [
    "search_policies",
    "orders_by_status",
    "issue_refund"
   ]
  },
  "mcp.session_legacy": {
   "call_bad_argument": {
    "is_error": true,
    "text": "Error executing tool orders_by_status: 1 validation error for orders_by_statusArguments\nstatus\n  Input should be 'COMPLETED', 'CANCELLED' or 'PENDING' [type=literal_error, input_value='SHIPPED', input"
   },
   "call_ok": {
    "is_error": false,
    "text": "{\"status\": \"COMPLETED\",\"orders\": 144}"
   },
   "call_tool_error": {
    "is_error": true,
    "text": "Error executing tool issue_refund"
   },
   "call_unknown": {
    "is_error": true,
    "text": "Unknown tool: no_such_tool"
   },
   "prompts": [
    "triage_order"
   ],
   "protocol_version": "2025-11-25",
   "resource_text": "orders(order_id int, store_id int, status text, total_eur decimal, placed_at date)",
   "resources": [
    "brewline://schema/orders"
   ],
   "server_info": {
    "name": "brewline-data",
    "version": ""
   },
   "tools": [
    "search_policies",
    "orders_by_status",
    "issue_refund"
   ]
  },
  "otel.summary": {
   "answer": "120 orders are completed.",
   "event_names_on_the_failed_span": [
    "exception",
    "exception"
   ],
   "input_tokens_total": 202,
   "model_calls": 3,
   "note": "the tokens are counted from the length of the scripted messages (one token for four characters), because no model ran. The attribute names follow the OpenTelemetry GenAI conventions, which are still in development.",
   "output_tokens_total": 46,
   "sdk": "opentelemetry-sdk 1.45.2",
   "spans": 6,
   "tool_calls": 2,
   "tool_errors": 1
  },
  "pg.iterative": {
   "ef_search_default": "40",
   "max_scan_tuples_default": "20000",
   "setting": "hnsw.iterative_scan = relaxed_order"
  },
  "pg.ivfflat_early": {
   "probes": 5,
   "recall@10": 1.0,
   "recall_when_built_after_loading_probes_5": 1.0,
   "rows_loaded_after": 29500,
   "rows_when_built": 500
  },
  "pg.limit": {
   "limit": 100,
   "rows_with_ef_search_200": 100,
   "rows_with_ef_search_40": 40
  },
  "pg.partial": {
   "index_bytes": 196608,
   "plan": [
    "Limit",
    "  ->  Index Scan using chunks_t1 on chunks",
    "        Order By: (embedding <=> '[-0.067499,0.049481,-0.050951,-0.164511,-0.053123,-0.13991,0.009576,0.196505,-0.038031,-0.159654,0.101447,-0.028536,-0.076968,-0.121125,0.055273,0.081869,-0.158974,-0.106488,-0.265309,-0.219237,-0.241774,-0.053191,-0.180889,0.080151,0.012141,-0.047363,-0.263544,0.006581,-0.069872,-0.00783,-0.132843,-0.049092,-0.186518,-0.089994,0.101988,-0.1023,-0.021988,0.103229,-0.055708,0.047154,0.053447,-0.028484,-0.174834,0.099533,0.167046,-0.184562,0.033911,0.008462,-0.085974,0.309326,0.094976,-0.193359,-0.025073,0.061254,-0.05854,0.139073,0.031412,0.129216,0.200472,-0.093794,-0.020287,-0.092159,0.040612,-0.200114]'::vector)"
   ],
   "rows_returned_mean": 10.0
  },
  "pg.plan_exact": {
   "plan": [
    "Limit",
    "  ->  Sort",
    "        Sort Key: ((embedding <=> '[-0.067499,0.049481,-0.050951,-0.164511,-0.053123,-0.13991,0.009576,0.196505,-0.038031,-0.159654,0.101447,-0.028536,-0.076968,-0.121125,0.055273,0.081869,-0.158974,-0.106488,-0.265309,-0.219237,-0.241774,-0.053191,-0.180889,0.080151,0.012141,-0.047363,-0.263544,0.006581,-0.069872,-0.00783,-0.132843,-0.049092,-0.186518,-0.089994,0.101988,-0.1023,-0.021988,0.103229,-0.055708,0.047154,0.053447,-0.028484,-0.174834,0.099533,0.167046,-0.184562,0.033911,0.008462,-0.085974,0.309326,0.094976,-0.193359,-0.025073,0.061254,-0.05854,0.139073,0.031412,0.129216,0.200472,-0.093794,-0.020287,-0.092159,0.040612,-0.200114]'::vector))",
    "        ->  Seq Scan on chunks"
   ]
  },
  "pg.plan_hnsw": {
   "build_seconds": 4.09,
   "index_bytes": 17096704,
   "index_bytes_per_row": 569.9,
   "plan": [
    "Limit",
    "  ->  Index Scan using chunks_hnsw on chunks",
    "        Order By: (embedding <=> '[-0.067499,0.049481,-0.050951,-0.164511,-0.053123,-0.13991,0.009576,0.196505,-0.038031,-0.159654,0.101447,-0.028536,-0.076968,-0.121125,0.055273,0.081869,-0.158974,-0.106488,-0.265309,-0.219237,-0.241774,-0.053191,-0.180889,0.080151,0.012141,-0.047363,-0.263544,0.006581,-0.069872,-0.00783,-0.132843,-0.049092,-0.186518,-0.089994,0.101988,-0.1023,-0.021988,0.103229,-0.055708,0.047154,0.053447,-0.028484,-0.174834,0.099533,0.167046,-0.184562,0.033911,0.008462,-0.085974,0.309326,0.094976,-0.193359,-0.025073,0.061254,-0.05854,0.139073,0.031412,0.129216,0.200472,-0.093794,-0.020287,-0.092159,0.040612,-0.200114]'::vector)"
   ]
  },
  "pg.table": {
   "column_bytes_halfvec64": 136,
   "column_bytes_vector64": 264,
   "dimensions": 64,
   "rows": 30000,
   "table_bytes": 9437184,
   "tenant_rows": {
    "1": 318,
    "2": 3112,
    "3": 26570
   }
  },
  "pg.versions": {
   "pgvector": "0.8.7",
   "postgres": "PostgreSQL 16.15 on x86_64-pc-linux-gnu"
  },
  "pipeline.notes": {
   "alias_steps": [
    "live -> index-v1.db: every query is served by the old index",
    "build index-v2.db with the new model while the old index keeps serving",
    "run the 24 questions on both indexes",
    "if the new index is not worse, write live -> index-v2.db (one small write)",
    "keep index-v1.db for a day, so that going back is one write too"
   ],
   "answer_after_edit": "Store handbook v2 Refunds and returns Training videos for this topic are on the staff portal. Write down anything unusual in the shift log. A customer may return an unused drink voucher or a sealed bag of beans within 21 days of p",
   "answer_before_edit": "Store handbook v2 Refunds and returns Training videos for this topic are on the staff portal. Write down anything unusual in the shift log. A customer may return an unused drink voucher or a sealed bag of beans within 14 days of p",
   "chunks_in_store": 87,
   "current_only_hits_from_handbook_v2": 0,
   "faq_chunks_visible_to_managers_after": 2,
   "faq_chunks_visible_to_staff_after": 0,
   "fifth_run": {
    "chunks_added": 0,
    "chunks_removed": 0,
    "chunks_unchanged": 84,
    "documents": 57,
    "documents_skipped": 56,
    "embedded": 0,
    "label_updates": 1
   },
   "first_run": {
    "chunks_added": 87,
    "chunks_removed": 0,
    "chunks_unchanged": 0,
    "documents": 58,
    "documents_skipped": 0,
    "embedded": 87,
    "label_updates": 0
   },
   "glossary_chunks_deleted": 3,
   "glossary_hits_after_delete": 0,
   "hit@3_new_model_index": 0.833,
   "hit@3_old_model_index": 0.75,
   "mixing": "a query vector from the new model has 48 numbers and the old index holds 64, so the comparison fails; with the same size and another model it would run and return rubbish",
   "rebuild": {
    "chunks_embedded": 84,
    "documents": 57
   },
   "second_run": {
    "chunks_added": 0,
    "chunks_removed": 0,
    "chunks_unchanged": 87,
    "documents": 58,
    "documents_skipped": 58,
    "embedded": 0,
    "label_updates": 0
   },
   "third_run": {
    "chunks_added": 1,
    "chunks_removed": 1,
    "chunks_unchanged": 86,
    "documents": 58,
    "documents_skipped": 57,
    "embedded": 1,
    "label_updates": 0
   }
  },
  "search.acl": {
   "allowed_audiences": [
    "all-staff",
    "managers"
   ],
   "questions": 24,
   "questions_whose_answer_is_in_a_restricted_document": 7,
   "questions_with_a_leak": 10,
   "restricted_chunks_in_top5_filter_inside_search": 0,
   "restricted_chunks_in_top5_no_filter": 18,
   "role": "manager",
   "slots_lost_when_filtering_after_search": 18
  },
  "search.by_kind": {
   "hit@3_by_kind": {
    "code": {
     "BM25 (keywords)": 1.0,
     "hybrid (RRF)": 1.0,
     "vector (stand-in)": 1.0
    },
    "meaning": {
     "BM25 (keywords)": 0.625,
     "hybrid (RRF)": 0.625,
     "vector (stand-in)": 0.5
    },
    "number": {
     "BM25 (keywords)": 1.0,
     "hybrid (RRF)": 1.0,
     "vector (stand-in)": 1.0
    },
    "stale": {
     "BM25 (keywords)": 1.0,
     "hybrid (RRF)": 1.0,
     "vector (stand-in)": 1.0
    },
    "table": {
     "BM25 (keywords)": 1.0,
     "hybrid (RRF)": 1.0,
     "vector (stand-in)": 0.0
    },
    "words": {
     "BM25 (keywords)": 1.0,
     "hybrid (RRF)": 1.0,
     "vector (stand-in)": 1.0
    }
   },
   "questions_by_kind": {
    "code": 1,
    "meaning": 8,
    "number": 2,
    "stale": 1,
    "table": 1,
    "words": 11
   }
  },
  "search.expansion_example": {
   "expanded": "Are gratuities from card payments paid in cash? tip also called gratuity tips follow different rules till money drawer holds",
   "note": "the glossary words come from the document set, not from the answers",
   "question": "Are gratuities from card payments paid in cash?"
  },
  "search.metric_check": {
   "all_equal": true,
   "compared": 12
  },
  "search.stale": {
   "BM25 (keywords)": {
    "questions_with_a_v1_chunk_in_top5": 9,
    "with_current_only_filter": 0
   },
   "hybrid (RRF)": {
    "questions_with_a_v1_chunk_in_top5": 12,
    "with_current_only_filter": 0
   },
   "vector (stand-in)": {
    "questions_with_a_v1_chunk_in_top5": 16,
    "with_current_only_filter": 0
   }
  },
  "sqlguard.summary": {
   "allowed": 7,
   "allowed_tables": [
    "orders",
    "products",
    "stores"
   ],
   "denied_columns": [
    "card_number",
    "email",
    "phone"
   ],
   "max_limit": 100,
   "queries": 14,
   "refused": 7,
   "refused_that_the_database_alone_would_have_run": 1
  },
  "tokens.model": {
   "chars_per_token_overall": 4.15,
   "chunks": 87,
   "example_pieces": [
    "S",
    "pi",
    "jkenisse",
    " Port"
   ],
   "kind": "byte-level BPE trained on the Brewline documents (a stand-in, not the tokenizer of any model)",
   "tokens_per_chunk_max": 150,
   "tokens_per_chunk_mean": 95.1,
   "training_chars": 34400,
   "vocab": 1500
  }
 },
 "files": {
  "agent/agent_graph.py": "\"\"\"A small agent for Brewline store managers, built with LangGraph. The lessons show this file, and the recorder runs it.\n\nThe model in this course is a script: a list of replies that the recorder gives it. A real model chooses its own replies, so a real run\ndiffers from the recorded one. What the recording shows is real: how the graph moves, what a tool error looks like, where the loop stops,\nwhat a checkpoint holds, and what happens at a point that needs a person.\n\"\"\"\nimport operator\nfrom typing import Annotated, TypedDict\n\nfrom langgraph.graph import END, START, StateGraph\nfrom langgraph.types import interrupt\n\nWRITE_TOOLS = {'issue_refund'}\n\n\nclass State(TypedDict):\n    messages: Annotated[list, operator.add]       # the conversation. New messages are added to it, never replaced.\n    steps: int                                    # how many times the model has been asked\n\n\nclass ScriptedModel:\n    \"\"\"Each step is a reply, or a function that reads the messages and returns a reply. A reply is {'tool_calls': [...]} or {'final': text}.\n    Like a real model it keeps nothing between calls: the step is chosen from the messages it is given (how many replies it has already made).\"\"\"\n\n    def __init__(self, script):\n        self.script = list(script)\n\n    def next(self, messages):\n        i = sum(1 for m in messages if m['role'] == 'assistant')\n        step = self.script[min(i, len(self.script) - 1)]\n        return step(messages) if callable(step) else step\n\n\ndef make_graph(model, tools, checkpointer=None, max_steps=8, approve_writes=True, on_tool=None):\n    def call_model(state):\n        reply = model.next(state['messages'])\n        return {'messages': [{'role': 'assistant', **reply}], 'steps': state['steps'] + 1}\n\n    def run_tools(state):\n        out = []\n        for call in state['messages'][-1]['tool_calls']:\n            name, args = call['name'], call['args']\n            if name not in tools:\n                out.append({'role': 'tool', 'name': name, 'ok': False, 'content': 'unknown tool %s' % name})\n                continue\n            if approve_writes and name in WRITE_TOOLS:\n                decision = interrupt({'tool': name, 'args': args, 'question': 'Approve this write?'})\n                if decision != 'approve':\n                    out.append({'role': 'tool', 'name': name, 'ok': False, 'content': 'the approver said no'})\n                    continue\n            try:\n                if on_tool:\n                    on_tool(name, args)                              # lets the recorder count how often a tool really runs\n                out.append({'role': 'tool', 'name': name, 'ok': True, 'content': tools[name](**args)})\n            except Exception as e:                                   # the error goes back to the model as a message, so that it can try again\n                out.append({'role': 'tool', 'name': name, 'ok': False, 'content': str(e)})\n        return {'messages': out}\n\n    def give_up(state):\n        return {'messages': [{'role': 'assistant', 'final': 'I stopped after %d steps without an answer.' % state['steps']}]}\n\n    def route(state):\n        last = state['messages'][-1]\n        if 'final' in last:\n            return END\n        return 'give_up' if state['steps'] >= max_steps else 'tools'\n\n    g = StateGraph(State)\n    g.add_node('model', call_model)\n    g.add_node('tools', run_tools)\n    g.add_node('give_up', give_up)\n    g.add_edge(START, 'model')\n    g.add_conditional_edges('model', route, ['tools', 'give_up', END])\n    g.add_edge('tools', 'model')\n    g.add_edge('give_up', END)\n    return g.compile(checkpointer=checkpointer)",
  "chunk/chunk_record.json": "{\n  \"id\": \"suppliers:0\",\n  \"doc_id\": \"suppliers\",\n  \"i\": 0,\n  \"text\": \"Supplier terms Andes Roasters Questions about this section go to the operations team. Andes Roasters delivers beans ever ...\",\n  \"audience\": \"finance\",\n  \"current\": true,\n  \"version\": 3,\n  \"content_hash\": \"5cdfc7d1ebb4bd0d\"\n}",
  "corpus/customer-faq.md": "# Customer FAQ\n\n## Points\n\nAsk your shift lead if anything in this section is unclear. Loyalty points expire 12 months after they are earned. Report broken equipment to the maintenance team the same day. Training videos for this topic are on the staff portal.\n\n## Gift cards\n\nThe area manager reviews these rules once a year. Keep a copy of this page in the back office. A gift card never expires and can be used in any store. Ask your shift lead if anything in this section is unclear. Report broken equipment to the maintenance team the same day. Training videos for this topic are on the staff portal.\n\n## Cold orders\n\nSmile, greet every guest, and keep the queue moving. If an order arrives cold, the customer gets a replacement drink or the money back. Lists of store contacts are kept at the till. The area manager reviews these rules once a year.",
  "corpus/glossary.md": "# Glossary\n\nWords that the staff and the customers use for the same thing.\n\n## Money back\nA refund is the same as a return. To reimburse a customer, or to give a shopper the money back, is a refund. A shopper is a customer. Unopened means sealed and unused. Customers also say \"money back\" or \"I want my money returned\".\n\n## Vouchers\nA voucher is also called a coupon or a ticket. An unused voucher can be returned like a sealed bag of beans.\n\n## Electricity\nA power cut, a blackout and an outage all mean that the electricity is off. Staff call it a power failure in the runbook.\n\n## Gratuities\nA tip is also called a gratuity. Card tips and cash tips follow different rules.\n\n## Reward points\nLoyalty points are the reward points of the app. Points stop being valid on an expiry date.\n\n## Coffee machine\nThe espresso machine is the coffee machine. Warm-up means switching it on early so that it reaches brewing temperature.\n\n## Till money\nThe cash drawer holds the till money. Counting it is also called a cash check.\n\n## Roaster\nAndes Roasters is the roaster. A roaster delivers beans, and a late delivery is a delivery that arrives after the agreed day.",
  "corpus/meeting-notes-2026-03.txt": "Meeting notes, 12 March 2026\nPresent: Maria Santos, Kenji Mori, and the three store leads.\nMaria Santos can be reached at maria.santos@brewline.example or +31 6 1234 5678. Kenji Mori can be reached at kenji.mori@brewline.example or +31 6 8765 4321.\n\nAgenda\n1. Summer menu. The pistachio cold brew sells well and stays on the menu.\n2. Milk prices. Decision: raise the milk alternative surcharge from EUR 0.40 to EUR 0.50 from 1 May.\n3. Payroll. The tip payout for February is paid to the account NL91ABNA0417164300. Order references such as ORD-2026-0412 and SKU-4471 are not personal data.\n4. Next meeting on 9 April. Please keep the area tidy and ask your shift lead if anything is unclear.",
  "corpus/meeting-notes-masked.txt": "Meeting notes, 12 March 2026\nPresent: Maria Santos, Kenji Mori, and the three store leads.\nMaria Santos can be reached at [EMAIL] or [PHONE]. Kenji Mori can be reached at [EMAIL] or [PHONE].\n\nAgenda\n1. Summer menu. The pistachio cold brew sells well and stays on the menu.\n2. Milk prices. Decision: raise the milk alternative surcharge from EUR 0.40 to EUR 0.50 from 1 May.\n3. Payroll. The tip payout for February is paid to the account [IBAN]. Order references such as ORD-2026-0412 and SKU-4471 are not personal data.\n4. Next meeting on 9 April. Please keep the area tidy and ask your shift lead if anything is unclear.",
  "corpus/menu-and-allergens.html": "<html><head><title>Menu and allergens</title><style>td{padding:2px}</style></head><body>\n<nav>Home | Menu | Stores | Careers</nav>\n<h1>Menu and allergens</h1>\n<h2>Allergens</h2>\n<p>Report broken equipment to the maintenance team the same day. Training videos for this topic are on the staff portal. The pistachio cold brew contains tree nuts and is made on shared equipment. Write down anything unusual in the shift log. Questions about this section go to the operations team.</p>\n<table><tr><th>Drink</th><th>Contains</th><th>May contain</th></tr><tr><td>Latte</td><td>milk</td><td>none</td></tr><tr><td>Oat flat white</td><td>oats</td><td>gluten</td></tr><tr><td>Almond croissant</td><td>tree nuts, gluten, milk, eggs</td><td>sesame</td></tr><tr><td>Pistachio cold brew</td><td>tree nuts</td><td>milk</td></tr><tr><td>Matcha latte</td><td>milk</td><td>none</td></tr></table>\n<script>var tracking = true;</script>\n<footer>Brewline 2026. All rights reserved.</footer>\n</body></html>",
  "docs/record.json": "{\n  \"doc_id\": \"handbook-v2\",\n  \"file\": \"store-handbook-v2.pdf\",\n  \"format\": \"pdf\",\n  \"audience\": \"managers\",\n  \"version\": 2,\n  \"current\": true,\n  \"hash\": \"954c34664d33aee9\",\n  \"source\": \"lake://raw/docs/store-handbook-v2.pdf\",\n  \"parsed_with\": \"pypdf 7.0.1\"\n}",
  "finetune/card.json": "{\n  \"name\": \"brewline-policy-qa\",\n  \"version\": \"2026-03-14\",\n  \"rows\": 161,\n  \"source\": \"corpus.py facts, 6 prompt templates\",\n  \"split\": \"grouped by fact\",\n  \"removed\": {\n    \"exact_duplicates\": 24,\n    \"near_duplicates\": 1\n  },\n  \"contains_personal_data\": false,\n  \"known_gaps\": [\n    \"no examples that refuse a question\",\n    \"one answer style\"\n  ]\n}",
  "finetune/preference_example.jsonl": "{\"prompt\": [{\"role\": \"user\", \"content\": \"How many days do customers have to return a bag of beans?\"}], \"chosen\": [{\"role\": \"assistant\", \"content\": \"Within 14 days of purchase, with a receipt (handbook v2).\"}], \"rejected\": [{\"role\": \"assistant\", \"content\": \"Within 30 days of purchase.\"}]}",
  "finetune/train_example.jsonl": "{\"messages\": [{\"role\": \"user\", \"content\": \"What is the rule about refunds and returns?\"}, {\"role\": \"assistant\", \"content\": \"A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.\"}]}\n{\"messages\": [{\"role\": \"user\", \"content\": \"A new colleague asks: Can a shopper get reimbursed for beans they have not opened?\"}, {\"role\": \"assistant\", \"content\": \"A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.\"}]}",
  "llm/request_with_tools.json": "{\n  \"model\": \"stand-in\",\n  \"max_tokens\": 100,\n  \"messages\": [\n    {\n      \"role\": \"user\",\n      \"content\": \"How long do customers have to return beans?\"\n    }\n  ],\n  \"tools\": [\n    {\n      \"name\": \"search_policies\",\n      \"description\": \"Find Brewline policy sentences.\",\n      \"input_schema\": {\n        \"type\": \"object\",\n        \"properties\": {\n          \"query\": {\n            \"type\": \"string\"\n          },\n          \"limit\": {\n            \"type\": \"integer\"\n          }\n        },\n        \"required\": [\n          \"query\"\n        ]\n      }\n    }\n  ]\n}",
  "mcp/first_request.json": "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"method\": \"server/discover\",\n  \"params\": {\n    \"_meta\": {\n      \"io.modelcontextprotocol/protocolVersion\": \"2026-07-28\",\n      \"io.modelcontextprotocol/clientInfo\": {\n        \"name\": \"mcp\",\n        \"version\": \"0.1.0\"\n      },\n      \"io.modelcontextprotocol/clientCapabilities\": {}\n    }\n  }\n}",
  "mcp/first_response.json": "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"cacheScope\": \"private\",\n    \"capabilities\": {\n      \"prompts\": {\n        \"listChanged\": true\n      },\n      \"resources\": {\n        \"listChanged\": true,\n        \"subscribe\": true\n      },\n      \"tools\": {\n        \"listChanged\": true\n      }\n    },\n    \"instructions\": \"Read Brewline policies and order counts. Writes need a person to approve them.\",\n    \"resultType\": \"complete\",\n    \"supportedVersions\": [\n      \"2026-07-28\"\n    ],\n    \"ttlMs\": 0,\n    \"_meta\": {\n      \"io.modelcontextprotocol/serverInfo\": {\n        \"name\": \"brewline-data\",\n        \"version\": \"\"\n      }\n    }\n  }\n}",
  "mcp/mcp_server.py": "\"\"\"An MCP server for the Brewline data. The lessons show this file. It runs over stdio: a client starts it as a child process.\"\"\"\nfrom typing import Literal\n\nfrom mcp.server.mcpserver import MCPServer\nfrom mcp.types import ToolAnnotations\n\napp = MCPServer('brewline-data', instructions='Read Brewline policies and order counts. Writes need a person to approve them.')\n\nPOLICIES = {\n    'refund window': 'A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.',\n    'refund approval': 'A refund above EUR 50 needs a second manager to approve it in the till.',\n    'milk storage': 'Milk must be stored at 5 degrees Celsius or lower, and the fridge temperature is logged at open and close.',\n}\nCOUNTS = {'COMPLETED': 144, 'CANCELLED': 24, 'PENDING': 32}\n\n\n@app.tool(annotations=ToolAnnotations(readOnlyHint=True))\ndef search_policies(query: str, limit: int = 3) -> list[str]:\n    \"\"\"Find the Brewline policy sentences that match the words of a question. Returns at most `limit` sentences.\"\"\"\n    words = set(query.lower().split())\n    hits = [s for k, s in POLICIES.items() if words & set(k.split()) or words & set(s.lower().split())]\n    return hits[:limit]\n\n\n@app.tool(annotations=ToolAnnotations(readOnlyHint=True))\ndef orders_by_status(status: Literal['COMPLETED', 'CANCELLED', 'PENDING']) -> dict:\n    \"\"\"Count the orders that have a status.\"\"\"\n    return {'status': status, 'orders': COUNTS[status]}\n\n\n@app.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False))\ndef issue_refund(order_id: str, amount: float) -> str:\n    \"\"\"Refund an order. This writes to the till system, so a person must approve it before the call.\"\"\"\n    if amount <= 0:\n        raise ValueError('the amount must be positive')\n    return 'refunded %.2f on %s' % (amount, order_id)\n\n\n@app.resource('brewline://schema/orders', mime_type='text/plain')\ndef orders_schema() -> str:\n    \"\"\"The columns of the orders table.\"\"\"\n    return 'orders(order_id int, store_id int, status text, total_eur decimal, placed_at date)'\n\n\n@app.prompt()\ndef triage_order(order_id: str) -> str:\n    \"\"\"A starting prompt for a question about one order.\"\"\"\n    return 'Look at order %s. Say its status, and say whether a refund is allowed by the policy. Do not issue a refund yourself.' % order_id\n\n\nif __name__ == '__main__':\n    app.run('stdio')",
  "mcp/mcp_tap.py": "\"\"\"A tap on the wire. It starts the real server as a child process, copies every line that passes in either direction to a log file, and changes nothing.\"\"\"\nimport json\nimport subprocess\nimport sys\nimport threading\n\nlog = open(sys.argv[1], 'w')\nchild = subprocess.Popen(sys.argv[2:], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)\n\n\ndef pump(src, dst, tag):\n    for line in src:\n        log.write(json.dumps({'dir': tag, 'line': line.rstrip('\\n')}) + '\\n')\n        log.flush()\n        dst.write(line)\n        dst.flush()\n\n\nthreading.Thread(target=pump, args=(child.stdout, sys.stdout, 'server->client'), daemon=True).start()\npump(sys.stdin, child.stdin, 'client->server')\nchild.stdin.close()\nchild.wait()",
  "mcp/tool_call.json": "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 3,\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"orders_by_status\",\n    \"arguments\": {\n      \"status\": \"COMPLETED\"\n    },\n    \"_meta\": {\n      \"io.modelcontextprotocol/protocolVersion\": \"2026-07-28\",\n      \"io.modelcontextprotocol/clientInfo\": {\n        \"name\": \"mcp\",\n        \"version\": \"0.1.0\"\n      },\n      \"io.modelcontextprotocol/clientCapabilities\": {}\n    }\n  }\n}",
  "mcp/tool_definition.json": "{\n  \"name\": \"orders_by_status\",\n  \"description\": \"Count the orders that have a status.\",\n  \"inputSchema\": {\n    \"type\": \"object\",\n    \"properties\": {\n      \"status\": {\n        \"enum\": [\n          \"COMPLETED\",\n          \"CANCELLED\",\n          \"PENDING\"\n        ],\n        \"title\": \"Status\",\n        \"type\": \"string\"\n      }\n    },\n    \"required\": [\n      \"status\"\n    ],\n    \"title\": \"orders_by_statusArguments\"\n  },\n  \"annotations\": {\n    \"readOnlyHint\": true\n  }\n}",
  "mcp/tool_result.json": "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 3,\n  \"result\": {\n    \"content\": [\n      {\n        \"text\": \"{\\n  \\\"status\\\": \\\"COMPLETED\\\",\\n  \\\"orders\\\": 144\\n}\",\n        \"type\": \"text\"\n      }\n    ],\n    \"isError\": false,\n    \"resultType\": \"complete\",\n    \"_meta\": {\n      \"io.modelcontextprotocol/serverInfo\": {\n        \"name\": \"brewline-data\",\n        \"version\": \"\"\n      }\n    }\n  }\n}",
  "pipeline/alias.json": "{\n  \"live\": \"index-v2.db\",\n  \"previous\": \"index-v1.db\",\n  \"model_id\": \"lsa-48-v2\",\n  \"switched_after\": \"hit@3 0.833 against 0.75\"\n}"
 },
 "meta": {
  "anthropic": "2.8.0",
  "beautifulsoup4": "4.15.0",
  "company": "Brewline",
  "datasketch": "2.0.0",
  "duckdb": "2.0.0",
  "faiss-cpu": "1.16.0",
  "fpdf2": "2.9.0",
  "hnswlib": "0.8.0",
  "langchain-core": "1.7.7",
  "langgraph": "1.2.20",
  "mcp": "2.3.0",
  "note": "Recorded by ai/verify/capture_ai.py with real open-source tools on one machine. No language model and no embedding model was used: the embedding is a TF-IDF and SVD stand-in, the agent model is scripted, and the LLM API is a local stand-in server. Nothing ran in a cloud.",
  "numpy": "2.5.4",
  "openai": "3.49.0",
  "opentelemetry-sdk": "1.45.2",
  "pgvector": "0.5.1",
  "pixeltable-pgserver": "0.7.2",
  "psycopg": "3.3.8",
  "pydantic": "2.14.3",
  "pypdf": "7.0.1",
  "pytest": "9.2.0",
  "python": "3.13.18",
  "python-docx": "1.2.0",
  "rank-bm25": "0.2.2",
  "scikit-learn": "1.9.1",
  "sqlglot": "30.31.0",
  "tokenizers": "0.23.3"
 },
 "tables": {
  "agent.history": {
   "cols": [
    "checkpoint",
    "next node",
    "model calls so far",
    "messages so far"
   ],
   "rows": [
    [
     0,
     "__start__",
     0,
     0
    ],
    [
     1,
     "model",
     0,
     1
    ],
    [
     2,
     "tools",
     1,
     2
    ],
    [
     3,
     "model",
     1,
     3
    ],
    [
     4,
     "tools",
     2,
     4
    ],
    [
     5,
     "model",
     2,
     5
    ],
    [
     6,
     "done",
     3,
     6
    ]
   ]
  },
  "agent.scenarios": {
   "cols": [
    "scenario",
    "model calls",
    "tool calls",
    "how it ended"
   ],
   "rows": [
    [
     "A. two tools, then an answer",
     3,
     2,
     "answer: Customers have 14 days (handbook v2). 120 orders are completed."
    ],
    [
     "B. a wrong argument, an error message, a second try",
     3,
     2,
     "answer: 120 orders are completed."
    ],
    [
     "C. the same call again and again, our limit of 6 steps",
     6,
     5,
     "answer: I stopped after 6 steps without an answer."
    ],
    [
     "D. a refund waits for a person (approve)",
     2,
     1,
     "refunds written: 0 before, 1 after approval"
    ],
    [
     "D. the same refund (deny)",
     2,
     1,
     "refunds written: 0, the model was told: issue_refund ERROR: the approver said no"
    ]
   ]
  },
  "ann.hnsw": {
   "cols": [
    "M (links)",
    "efSearch",
    "recall@10",
    "distance computations per query",
    "% of the data compared"
   ],
   "rows": [
    [
     8,
     8,
     0.589,
     175,
     0.6
    ],
    [
     8,
     16,
     0.76,
     242,
     0.8
    ],
    [
     8,
     32,
     0.909,
     352,
     1.2
    ],
    [
     8,
     64,
     0.975,
     498,
     1.7
    ],
    [
     8,
     128,
     0.993,
     652,
     2.2
    ],
    [
     8,
     256,
     0.999,
     769,
     2.6
    ],
    [
     16,
     8,
     0.716,
     262,
     0.9
    ],
    [
     16,
     16,
     0.888,
     362,
     1.2
    ],
    [
     16,
     32,
     0.967,
     500,
     1.7
    ],
    [
     16,
     64,
     0.995,
     654,
     2.2
    ],
    [
     16,
     128,
     1.0,
     774,
     2.6
    ],
    [
     16,
     256,
     1.0,
     840,
     2.8
    ],
    [
     32,
     8,
     0.787,
     347,
     1.2
    ],
    [
     32,
     16,
     0.919,
     452,
     1.5
    ],
    [
     32,
     32,
     0.988,
     596,
     2.0
    ],
    [
     32,
     64,
     0.999,
     740,
     2.5
    ],
    [
     32,
     128,
     1.0,
     851,
     2.8
    ],
    [
     32,
     256,
     1.0,
     934,
     3.1
    ]
   ]
  },
  "ann.hnswlib": {
   "cols": [
    "ef",
    "recall@10 (hnswlib, M=16)"
   ],
   "rows": [
    [
     10,
     0.768
    ],
    [
     50,
     0.992
    ],
    [
     200,
     1.0
    ]
   ]
  },
  "ann.ivf": {
   "cols": [
    "nprobe (lists read)",
    "recall@10",
    "vectors compared per query",
    "% of the data compared"
   ],
   "rows": [
    [
     1,
     0.35,
     165,
     0.6
    ],
    [
     2,
     0.565,
     304,
     1.0
    ],
    [
     4,
     0.833,
     567,
     1.9
    ],
    [
     8,
     0.988,
     1042,
     3.5
    ],
    [
     16,
     1.0,
     1997,
     6.7
    ],
    [
     32,
     1.0,
     3893,
     13.0
    ],
    [
     64,
     1.0,
     7683,
     25.6
    ]
   ]
  },
  "ann.pq": {
   "cols": [
    "sub-vectors (m)",
    "index",
    "recall@10 at nprobe 16"
   ],
   "rows": [
    [
     8,
     "IVF + PQ, 8 bytes for each vector",
     0.129
    ],
    [
     16,
     "IVF + PQ, 16 bytes for each vector",
     0.284
    ],
    [
     32,
     "IVF + PQ, 32 bytes for each vector",
     0.719
    ]
   ]
  },
  "ann.sizes": {
   "cols": [
    "index",
    "bytes of vector data per vector",
    "recall@10",
    "bytes per vector in the whole index"
   ],
   "rows": [
    [
     "exact (Flat)",
     256,
     1.0,
     256
    ],
    [
     "HNSW M=16, efSearch 64",
     256,
     0.995,
     400
    ],
    [
     "IVF 256 lists, nprobe 16",
     256,
     1.0,
     266
    ],
    [
     "IVF + PQ (8 bytes), nprobe 16",
     8,
     0.129,
     20
    ]
   ]
  },
  "chunk.strategies": {
   "cols": [
    "strategy",
    "chunks",
    "mean chars",
    "cut mid-sentence %",
    "facts whole in one chunk",
    "BM25 hit@3",
    "vector hit@3",
    "hybrid hit@3"
   ],
   "rows": [
    [
     "fixed 500, no overlap",
     81,
     425,
     28,
     "26 of 27",
     0.708,
     0.75,
     0.75
    ],
    [
     "fixed 500, overlap 100",
     129,
     307,
     19,
     "27 of 27",
     0.833,
     0.833,
     0.833
    ],
    [
     "whole sentences up to 500",
     82,
     414,
     0,
     "27 of 27",
     0.833,
     0.833,
     0.833
    ],
    [
     "recursive 500",
     87,
     395,
     9,
     "27 of 27",
     0.875,
     0.792,
     0.875
    ],
    [
     "by heading, up to 500",
     181,
     177,
     2,
     "27 of 27",
     0.833,
     0.792,
     0.833
    ]
   ]
  },
  "chunk.sweep": {
   "cols": [
    "target size (chars)",
    "chunks",
    "mean chars",
    "facts whole",
    "hybrid hit@3",
    "hybrid hit@5",
    "chars sent to the model for top 5"
   ],
   "rows": [
    [
     150,
     314,
     108,
     "27 of 27",
     0.708,
     0.833,
     540
    ],
    [
     300,
     159,
     215,
     "27 of 27",
     0.75,
     0.833,
     1075
    ],
    [
     500,
     87,
     395,
     "27 of 27",
     0.875,
     0.875,
     1975
    ],
    [
     800,
     72,
     477,
     "27 of 27",
     0.833,
     0.875,
     2385
    ],
    [
     1500,
     62,
     555,
     "27 of 27",
     0.833,
     0.917,
     2775
    ]
   ]
  },
  "docs.dups": {
   "cols": [
    "document A",
    "document B",
    "exact Jaccard",
    "MinHash estimate"
   ],
   "rows": [
    [
     "handbook-v2",
     "handbook-v1",
     0.809,
     0.75
    ],
    [
     "equipment",
     "runbook",
     0.213,
     0.25
    ],
    [
     "equipment",
     "menu",
     0.179,
     0.164
    ],
    [
     "equipment",
     "leave",
     0.152,
     0.164
    ],
    [
     "menu",
     "runbook",
     0.151,
     0.148
    ]
   ]
  },
  "docs.formats": {
   "cols": [
    "file",
    "format",
    "audience",
    "version",
    "current",
    "chars read",
    "chars kept"
   ],
   "rows": [
    [
     "store-handbook-v2.pdf",
     "pdf",
     "managers",
     "v2",
     "yes",
     3865,
     3423
    ],
    [
     "store-handbook-v1.pdf",
     "pdf",
     "managers",
     "v1",
     "no (superseded)",
     3664,
     3222
    ],
    [
     "supplier-terms.pdf",
     "pdf",
     "finance",
     "v3",
     "yes",
     998,
     907
    ],
    [
     "equipment-care.pdf",
     "pdf",
     "managers",
     "v1",
     "yes",
     767,
     674
    ],
    [
     "leave-policy.docx",
     "docx",
     "hr",
     "v4",
     "yes",
     824,
     824
    ],
    [
     "menu-and-allergens.html",
     "html",
     "all-staff",
     "v5",
     "yes",
     610,
     567
    ],
    [
     "customer-faq.md",
     "md",
     "all-staff",
     "v2",
     "yes",
     855,
     855
    ],
    [
     "loyalty-program.md",
     "md",
     "all-staff",
     "v1",
     "yes",
     213,
     213
    ],
    [
     "incident-runbook.md",
     "md",
     "managers",
     "v2",
     "yes",
     686,
     686
    ],
    [
     "price-list-2026.md",
     "md",
     "finance",
     "v1",
     "yes",
     252,
     252
    ],
    [
     "glossary.md",
     "md",
     "all-staff",
     "v1",
     "yes",
     1158,
     1158
    ],
    [
     "meeting-notes-2026-03.txt",
     "txt",
     "managers",
     "v1",
     "yes",
     692,
     692
    ]
   ]
  },
  "embed.pairs": {
   "cols": [
    "text A",
    "text B",
    "cosine similarity"
   ],
   "rows": [
    [
     "refund",
     "money back",
     0.598
    ],
    [
     "refund",
     "espresso machine",
     -0.04
    ],
    [
     "power cut",
     "electricity is cut",
     0.895
    ],
    [
     "tips",
     "gratuities",
     0.244
    ],
    [
     "loyalty points",
     "reward points",
     0.812
    ],
    [
     "loyalty points",
     "milk fridge",
     -0.014
    ],
    [
     "Can a shopper get reimbursed for beans they have not opened?",
     "A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.",
     0.347
    ],
    [
     "Can a shopper get reimbursed for beans they have not opened?",
     "The steam wands are purged and wiped after every use and descaled every Sunday night.",
     0.024
    ]
   ]
  },
  "finetune.split": {
   "cols": [
    "split",
    "training examples",
    "validation examples",
    "validation answers that also appear in training"
   ],
   "rows": [
    [
     "random 80 / 20",
     129,
     32,
     32
    ],
    [
     "grouped by fact",
     131,
     30,
     0
    ]
   ]
  },
  "inject.outcomes": {
   "cols": [
    "run",
    "defence",
    "money refunded",
    "how it ended",
    "paused for a person"
   ],
   "rows": [
    [
     "1. nothing in the way",
     "none",
     "EUR 500.0",
     "answer: Refunds are allowed within 14 days with a receipt.",
     "no"
    ],
    [
     "2. the assistant has no write tool",
     "least privilege: only read tools are given",
     "none",
     "answer: Refunds are allowed within 14 days with a receipt.",
     "no"
    ],
    [
     "3. a person approves each write",
     "human approval before a write (the person said no)",
     "none",
     "answer: Refunds are allowed within 14 days with a receipt.",
     "yes"
    ],
    [
     "4. the tool checks its arguments",
     "the tool refuses an order that is not in the conversation and an amount above 50",
     "none",
     "answer: Refunds are allowed within 14 days with a receipt.",
     "no"
    ]
   ]
  },
  "llm.retries": {
   "cols": [
    "SDK",
    "what the server did",
    "requests sent",
    "retry count in each request",
    "what the caller got",
    "wait between requests (s)"
   ],
   "rows": [
    [
     "anthropic",
     "429 with retry-after: 1",
     2,
     "0, 1",
     "answer returned",
     "about 1.0 (the header)"
    ],
    [
     "anthropic",
     "529, then 429, then 200",
     3,
     "0, 1, 2",
     "answer returned",
     "0.4 to 0.5, then 0.8 to 1.0 (backoff with jitter)"
    ],
    [
     "anthropic",
     "500 three times",
     3,
     "0, 1, 2",
     "InternalServerError",
     "0.4 to 0.5, then 0.8 to 1.0 (backoff with jitter)"
    ],
    [
     "anthropic",
     "400, a bad request",
     1,
     "0",
     "BadRequestError",
     "-"
    ],
    [
     "anthropic",
     "an answer slower than the timeout (0.5 s), one retry allowed",
     2,
     "0, 1",
     "APITimeoutError",
     "the timeout, then 0.4 to 0.5"
    ],
    [
     "anthropic",
     "429 with retries switched off",
     1,
     "0",
     "RateLimitError",
     "-"
    ],
    [
     "openai",
     "429 with retry-after: 1",
     2,
     "0, 1",
     "answer returned",
     "about 1.0 (the header)"
    ],
    [
     "openai",
     "529, then 429, then 200",
     3,
     "0, 1, 2",
     "answer returned",
     "0.4 to 0.5, then 0.8 to 1.0 (backoff with jitter)"
    ],
    [
     "openai",
     "500 three times",
     3,
     "0, 1, 2",
     "InternalServerError",
     "0.4 to 0.5, then 0.8 to 1.0 (backoff with jitter)"
    ],
    [
     "openai",
     "400, a bad request",
     1,
     "0",
     "BadRequestError",
     "-"
    ],
    [
     "openai",
     "an answer slower than the timeout (0.5 s), one retry allowed",
     2,
     "0, 1",
     "APITimeoutError",
     "the timeout, then 0.4 to 0.5"
    ],
    [
     "openai",
     "429 with retries switched off",
     1,
     "0",
     "RateLimitError",
     "-"
    ]
   ]
  },
  "mcp.wire": {
   "cols": [
    "#",
    "direction",
    "message",
    "id",
    "bytes"
   ],
   "rows": [
    [
     1,
     "client->server",
     "server/discover",
     1,
     245
    ],
    [
     2,
     "server->client",
     "result",
     1,
     435
    ],
    [
     3,
     "client->server",
     "tools/list",
     2,
     240
    ],
    [
     4,
     "server->client",
     "result",
     2,
     1616
    ],
    [
     5,
     "client->server",
     "tools/call",
     3,
     301
    ],
    [
     6,
     "server->client",
     "result",
     3,
     251
    ],
    [
     7,
     "client->server",
     "tools/call",
     4,
     307
    ],
    [
     8,
     "server->client",
     "result",
     4,
     230
    ],
    [
     9,
     "client->server",
     "tools/call",
     5,
     299
    ],
    [
     10,
     "server->client",
     "result",
     5,
     493
    ],
    [
     11,
     "client->server",
     "tools/call",
     6,
     277
    ],
    [
     12,
     "server->client",
     "result",
     6,
     223
    ],
    [
     13,
     "client->server",
     "resources/list",
     7,
     244
    ],
    [
     14,
     "server->client",
     "result",
     7,
     322
    ],
    [
     15,
     "client->server",
     "resources/read",
     8,
     277
    ],
    [
     16,
     "server->client",
     "result",
     8,
     341
    ],
    [
     17,
     "client->server",
     "prompts/list",
     9,
     242
    ],
    [
     18,
     "server->client",
     "result",
     9,
     329
    ]
   ]
  },
  "mcp.wire_legacy": {
   "cols": [
    "#",
    "direction",
    "message",
    "id",
    "bytes"
   ],
   "rows": [
    [
     1,
     "client->server",
     "initialize",
     1,
     152
    ],
    [
     2,
     "server->client",
     "result",
     1,
     344
    ],
    [
     3,
     "client->server",
     "notifications/initialized",
     "",
     54
    ],
    [
     4,
     "client->server",
     "tools/list",
     2,
     46
    ],
    [
     5,
     "server->client",
     "result",
     2,
     1474
    ],
    [
     6,
     "client->server",
     "tools/call",
     3,
     118
    ],
    [
     7,
     "server->client",
     "result",
     3,
     142
    ],
    [
     8,
     "client->server",
     "tools/call",
     4,
     124
    ],
    [
     9,
     "server->client",
     "result",
     4,
     121
    ],
    [
     10,
     "client->server",
     "tools/call",
     5,
     116
    ],
    [
     11,
     "server->client",
     "result",
     5,
     384
    ],
    [
     12,
     "client->server",
     "tools/call",
     6,
     94
    ],
    [
     13,
     "server->client",
     "result",
     6,
     114
    ],
    [
     14,
     "client->server",
     "resources/list",
     7,
     50
    ],
    [
     15,
     "server->client",
     "result",
     7,
     180
    ],
    [
     16,
     "client->server",
     "resources/read",
     8,
     94
    ],
    [
     17,
     "server->client",
     "result",
     8,
     199
    ],
    [
     18,
     "client->server",
     "prompts/list",
     9,
     48
    ],
    [
     19,
     "server->client",
     "result",
     9,
     187
    ]
   ]
  },
  "otel.spans": {
   "cols": [
    "span",
    "parent",
    "kind",
    "status",
    "attributes",
    "events"
   ],
   "rows": [
    [
     "invoke_agent brewline-assistant",
     "",
     "INTERNAL",
     "UNSET",
     "agent.name=brewline-assistant",
     0
    ],
    [
     "chat stand-in-model",
     "invoke_agent brewline-assistant",
     "CLIENT",
     "UNSET",
     "request.model=stand-in-model, usage.input_tokens=15, usage.output_tokens=18",
     0
    ],
    [
     "execute_tool orders_by_status",
     "invoke_agent brewline-assistant",
     "INTERNAL",
     "ERROR",
     "tool.name=orders_by_status",
     2
    ],
    [
     "chat stand-in-model",
     "invoke_agent brewline-assistant",
     "CLIENT",
     "UNSET",
     "request.model=stand-in-model, usage.input_tokens=72, usage.output_tokens=19",
     0
    ],
    [
     "execute_tool orders_by_status",
     "invoke_agent brewline-assistant",
     "INTERNAL",
     "UNSET",
     "tool.name=orders_by_status",
     0
    ],
    [
     "chat stand-in-model",
     "invoke_agent brewline-assistant",
     "CLIENT",
     "UNSET",
     "request.model=stand-in-model, usage.input_tokens=115, usage.output_tokens=9",
     0
    ]
   ]
  },
  "pg.filter": {
   "cols": [
    "tenant",
    "share of the rows",
    "rows returned for LIMIT 10 (default)",
    "rows returned with iterative scan",
    "recall@10 with iterative scan"
   ],
   "rows": [
    [
     1,
     "1 %",
     0.4,
     10.0,
     0.978
    ],
    [
     2,
     "10 %",
     3.9,
     10.0,
     0.983
    ],
    [
     3,
     "89 %",
     10.0,
     10.0,
     0.977
    ]
   ]
  },
  "pg.hnsw_recall": {
   "cols": [
    "hnsw.ef_search",
    "recall@10 of the index against exact search"
   ],
   "rows": [
    [
     10,
     0.86
    ],
    [
     20,
     0.949
    ],
    [
     40,
     0.984
    ],
    [
     100,
     0.989
    ],
    [
     200,
     0.999
    ],
    [
     400,
     0.999
    ]
   ]
  },
  "pg.ivfflat": {
   "cols": [
    "ivfflat.probes",
    "recall@10 (100 lists, built after loading)"
   ],
   "rows": [
    [
     1,
     0.62
    ],
    [
     5,
     1.0
    ],
    [
     10,
     1.0
    ],
    [
     30,
     1.0
    ]
   ]
  },
  "pipeline.runs": {
   "cols": [
    "run",
    "documents",
    "chunks added",
    "chunks unchanged",
    "chunks removed",
    "embeddings computed",
    "label updates"
   ],
   "rows": [
    [
     "1. first run, every document is new",
     58,
     87,
     0,
     0,
     87,
     0
    ],
    [
     "2. the same files again",
     58,
     0,
     87,
     0,
     0,
     0
    ],
    [
     "3. one sentence of the handbook changed",
     58,
     1,
     86,
     1,
     1,
     0
    ],
    [
     "4. the glossary is deleted (a delete is a run)",
     57,
     0,
     84,
     0,
     0,
     0
    ],
    [
     "5. the FAQ may now be read by managers only",
     57,
     0,
     84,
     0,
     0,
     1
    ],
    [
     "6. the handbook is marked as not current",
     57,
     0,
     84,
     0,
     0,
     1
    ]
   ]
  },
  "search.acl_questions": {
   "cols": [
    "question",
    "restricted chunks in the top 5",
    "answer lives in a restricted document"
   ],
   "rows": [
    [
     "q04",
     2,
     "yes"
    ],
    [
     "q05",
     2,
     "yes"
    ],
    [
     "q07",
     2,
     "yes"
    ],
    [
     "q10",
     2,
     "no"
    ],
    [
     "q13",
     1,
     "no"
    ],
    [
     "q16",
     3,
     "yes"
    ],
    [
     "q17",
     1,
     "yes"
    ],
    [
     "q18",
     1,
     "no"
    ],
    [
     "q19",
     2,
     "yes"
    ],
    [
     "q21",
     2,
     "yes"
    ]
   ]
  },
  "search.expansion": {
   "cols": [
    "method",
    "hit@3 as asked",
    "hit@3 with glossary words added",
    "MRR@10 as asked",
    "MRR@10 with glossary words added"
   ],
   "rows": [
    [
     "BM25 (keywords)",
     0.875,
     0.792,
     0.772,
     0.602
    ],
    [
     "vector (stand-in)",
     0.792,
     0.708,
     0.669,
     0.483
    ],
    [
     "hybrid (RRF)",
     0.875,
     0.75,
     0.754,
     0.548
    ]
   ]
  },
  "search.methods": {
   "cols": [
    "method",
    "hit@1",
    "hit@3",
    "hit@5",
    "MRR@10",
    "nDCG@10"
   ],
   "rows": [
    [
     "BM25 (keywords)",
     0.667,
     0.875,
     0.917,
     0.772,
     0.809
    ],
    [
     "vector (stand-in)",
     0.5,
     0.792,
     0.875,
     0.669,
     0.731
    ],
    [
     "hybrid (RRF)",
     0.625,
     0.875,
     0.875,
     0.754,
     0.804
    ]
   ]
  },
  "search.questions": {
   "cols": [
    "id",
    "kind",
    "question",
    "BM25 rank",
    "vector rank",
    "hybrid rank"
   ],
   "rows": [
    [
     "q01",
     "words",
     "How many days do customers have to return a bag of beans?",
     2,
     2,
     2
    ],
    [
     "q02",
     "words",
     "When must an injury be written in the incident log?",
     1,
     1,
     1
    ],
    [
     "q03",
     "code",
     "What is the product code of the descaler?",
     1,
     1,
     1
    ],
    [
     "q04",
     "words",
     "What is the minimum order for Andes Roasters?",
     1,
     1,
     1
    ],
    [
     "q05",
     "words",
     "How many weeks of parental leave are paid at full pay?",
     1,
     1,
     1
    ],
    [
     "q06",
     "words",
     "What temperature must milk be stored at?",
     1,
     1,
     1
    ],
    [
     "q07",
     "words",
     "When does Hillside Dairy deliver milk, and by when must a missed delivery be reported?",
     1,
     1,
     1
    ],
    [
     "q08",
     "words",
     "How long does descaling the espresso machine take?",
     1,
     2,
     1
    ],
    [
     "q09",
     "meaning",
     "Can a shopper get reimbursed for beans they have not opened?",
     "-",
     9,
     10
    ],
    [
     "q10",
     "meaning",
     "What should the team do if electricity is cut for a long time?",
     2,
     1,
     2
    ],
    [
     "q11",
     "meaning",
     "Is it safe to serve the pistachio drink to someone with a nut allergy?",
     1,
     2,
     1
    ],
    [
     "q12",
     "meaning",
     "When do reward points stop being valid?",
     3,
     5,
     3
    ],
    [
     "q13",
     "meaning",
     "Are gratuities from card payments paid in cash?",
     2,
     1,
     1
    ],
    [
     "q14",
     "meaning",
     "How often must the till money be checked?",
     "-",
     "-",
     "-"
    ],
    [
     "q15",
     "meaning",
     "How early do we warm up the coffee machines?",
     5,
     "-",
     6
    ],
    [
     "q16",
     "meaning",
     "What happens when the roaster delivers late?",
     2,
     2,
     2
    ],
    [
     "q17",
     "number",
     "What is the price of a large oat flat white?",
     1,
     1,
     1
    ],
    [
     "q18",
     "table",
     "Which drinks contain tree nuts?",
     1,
     4,
     2
    ],
    [
     "q19",
     "number",
     "What is the lead time for Andes Roasters?",
     1,
     1,
     1
    ],
    [
     "q20",
     "stale",
     "Above what amount does a refund need a second manager?",
     1,
     2,
     2
    ],
    [
     "q21",
     "words",
     "From which day of sickness is a doctor's note needed?",
     1,
     2,
     1
    ],
    [
     "q22",
     "words",
     "Where is the assembly point in a fire?",
     1,
     2,
     1
    ],
    [
     "q23",
     "words",
     "What was decided about the surcharge for milk alternatives?",
     1,
     1,
     1
    ],
    [
     "q24",
     "words",
     "What does Gold status give a customer?",
     1,
     1,
     1
    ]
   ]
  },
  "sqlguard.decisions": {
   "cols": [
    "what the model wrote",
    "SQL",
    "the guard says",
    "why, or what it changed",
    "read-only connection alone",
    "no protection at all (on a copy)"
   ],
   "rows": [
    [
     "count orders by status",
     "SELECT status, COUNT(*) AS n FROM orders GROUP BY status",
     "allowed",
     "LIMIT 100 added",
     "3 row(s)",
     "ran: 3 row(s)"
    ],
    [
     "everything, no limit",
     "SELECT * FROM orders",
     "allowed",
     "LIMIT 100 added",
     "200 row(s)",
     "ran: 200 row(s)"
    ],
    [
     "a join with a limit",
     "SELECT o.order_id, s.name FROM orders o JOIN stores s ON s.store_id = o.store...",
     "allowed",
     "",
     "5 row(s)",
     "ran: 5 row(s)"
    ],
    [
     "a CTE",
     "WITH t AS (SELECT * FROM orders) SELECT COUNT(*) FROM t",
     "allowed",
     "LIMIT 100 added",
     "1 row(s)",
     "ran: 1 row(s)"
    ],
    [
     "a comment hides a second command",
     "SELECT order_id FROM orders LIMIT 2 -- ; DROP TABLE orders",
     "allowed",
     "",
     "2 row(s)",
     "ran: 2 row(s)"
    ],
    [
     "a limit of a million",
     "SELECT order_id, total_eur FROM orders ORDER BY total_eur DESC LIMIT 1000000",
     "allowed",
     "LIMIT lowered from 1000000 to 100",
     "200 row(s)",
     "ran: 200 row(s)"
    ],
    [
     "personal data, in a table",
     "SELECT email FROM customers",
     "refused",
     "the table customers is not on the allow list",
     "10 row(s)",
     "ran: 10 row(s)"
    ],
    [
     "a drop",
     "DROP TABLE orders",
     "refused",
     "only SELECT is allowed, found DROP",
     "Invalid Input Error: Cannot execute statement of type \"DROP\" on database \"brewline\" which ",
     "ran: the table orders is gone"
    ],
    [
     "two statements",
     "SELECT 1; DROP TABLE orders",
     "refused",
     "exactly one statement is allowed, found 2",
     "Invalid Input Error: Cannot execute statement of type \"DROP\" on database \"brewline\" which ",
     "ran: the table orders is gone"
    ],
    [
     "read a file",
     "SELECT * FROM read_csv('/work/secret.csv')",
     "refused",
     "table functions are not allowed (they read files and URLs)",
     "Permission Error: Cannot access file \"/work/secret.csv\" - file system o",
     "ran: ('sk-NOT-A-REAL-KEY-1234',)"
    ],
    [
     "write a file",
     "COPY orders TO '/work/out.csv'",
     "refused",
     "only SELECT is allowed, found COPY",
     "Permission Error: Cannot access file \"/work/out.csv\" - file system oper",
     "ran: 1 row(s)"
    ],
    [
     "attach another database",
     "ATTACH '/work/other.db' AS x",
     "refused",
     "only SELECT is allowed, found ATTACH",
     "Permission Error: Cannot access file \"/work/other.db\" - file system ope",
     "ran"
    ],
    [
     "a cross join that never ends",
     "SELECT COUNT(*) FROM orders o1, orders o2, orders o3, orders o4, orders o5...",
     "allowed",
     "LIMIT 100 added",
     "timeout after 1 s (interrupted)",
     "not run: it would keep the server busy for about a minute"
    ],
    [
     "not SQL",
     "show me the orders please",
     "refused",
     "only SELECT is allowed, found COMMAND",
     "Parser Error: syntax error at or near \"the\"",
     "failed: Parser Error: syntax error at or near \"the\""
    ]
   ]
  },
  "tokens.samples": {
   "cols": [
    "text",
    "characters",
    "bytes",
    "tokens (stand-in BPE)",
    "characters per token"
   ],
   "rows": [
    [
     "plain English",
     86,
     86,
     18,
     4.78
    ],
    [
     "a product code",
     17,
     17,
     12,
     1.42
    ],
    [
     "a price",
     8,
     8,
     5,
     1.6
    ],
    [
     "a long number",
     22,
     22,
     15,
     1.47
    ],
    [
     "a place name",
     16,
     16,
     4,
     4.0
    ],
    [
     "JSON",
     71,
     71,
     50,
     1.42
    ],
    [
     "Dutch",
     72,
     72,
     40,
     1.8
    ],
    [
     "Thai",
     42,
     118,
     116,
     0.36
    ],
    [
     "an emoji",
     16,
     22,
     14,
     1.14
    ]
   ]
  }
 },
 "text": {}
};
