/**
 * Content model for the article "Who Controls the Agent?" (Figma node 186:286).
 *
 * The long-form copy lives here as plain, serialisable data so the rendering
 * components stay small and the table-of-contents is generated from a single
 * source of truth (each section's `id` is its in-page anchor + TOC link target).
 *
 * Fidelity notes (the Figma source is a work-in-progress mock):
 *  - The "In 2025, Palo Alto Networks…" M&A paragraph appears as placeholder
 *    filler under several section headers. It is the genuine lead only for
 *    "The Gap the Market Left Open"; the duplicate copies under "The
 *    Architecture" / "Three Solution Types" are dropped so the page does not
 *    render three identical paragraphs.
 *  - Obvious text glitches in the source (e.g. "Ope"→"Open", stray "c" where a
 *    space belongs) are corrected.
 */

/** An inline text run; `bold` lead-ins render at font-weight 700 (faux-bold). */
export type Run = { text: string; bold?: boolean }

export type Block =
  | { type: 'p'; runs: Run[] }
  | { type: 'figure'; src: string; alt: string; caption: string }
  | { type: 'item'; label: string; paras: Run[][] }

export type Section = {
  /** in-page anchor id + TOC link target */
  id: string
  /** label shown in the table of contents */
  toc: string
  /** section heading (rendered as <h2>) */
  heading: string
  blocks: Block[]
}

// --- helpers to keep the data below terse ---
const t = (text: string): Run => ({ text })
const b = (text: string): Run => ({ text, bold: true })
/** a paragraph block from plain text */
const p = (text: string): Block => ({ type: 'p', runs: [t(text)] })
/** a paragraph block whose first run is a bold lead-in */
const lead = (boldText: string, rest: string): Block => ({
  type: 'p',
  runs: [b(boldText), t(rest)],
})

export const TITLE = 'Who Controls the Agent?'
export const SUBTITLE = 'One missing infrastructure layer in enterprise AI'
export const AUTHOR = 'Mike Collins'
export const DATE = 'Mar 19, 2026'
/**
 * The article's cover. One image serves both surfaces — the listing card and
 * the hero on the article itself — since the hero card stopped being a backdrop
 * with a screenshot laid over it.
 */
export const ARTICLE_COVER = '/images/articles/card-placeholder.webp'

/** Untitled intro paragraphs that sit above the first titled section. */
export const LEAD: Run[][] = [
  [
    t(
      "On April 25, 2026, a coding agent deleted a company's entire production database in nine seconds. The founder, Jer Crane of PocketOS, had been running a standard task in a staging environment. The agent encountered a credential mismatch, decided autonomously to resolve it, found an unrelated API token with administrative authority over the cloud infrastructure, and executed a deletion command. The production database was gone. So were all the backups. They lived under the same token scope.",
    ),
  ],
  [
    t(
      'Crane spent two days in emergency recovery while his customers tried to operate without their data. When he asked the agent to explain itself, it wrote: "I violated every principle I was given. I guessed instead of verifying. I ran a destructive action without being asked." What happened at PocketOS was the predictable outcome of deploying an AI agent with production credentials and no governance layer, which is how the overwhelming majority of enterprise agent deployments are configured today.',
    ),
  ],
  [
    t(
      "It wasn't just one event. Within months, Replit's agent wiped a production database for twelve hundred executives despite an explicit instruction freeze, and Alibaba's own coding agent began autonomously mining cryptocurrency during a training run. Three incidents. Three different companies. One common thread: nothing stood between the agent and the systems it could affect.",
    ),
  ],
  [
    t(
      "In April 2026, the Cloud Security Alliance found that 82% of enterprises had discovered previously unknown AI agents on their networks in the prior year. 35% had experienced financial losses from agent incidents. Only 21% maintained a real-time agent registry. McKinsey's November 2025 State of AI concluded that agentic workflows are spreading faster than governance models can address their risks.",
    ),
  ],
  [
    t(
      'The shift happened the moment agents moved from read to write access. When agents could only retrieve and summarize, there was nothing to constrain. Now they can act.',
    ),
  ],
]

export const SECTIONS: Section[] = [
  {
    id: 'how-enterprises-control-agents',
    toc: 'How Enterprises Try to Control Agents Today',
    heading: 'How Enterprises Try to Control Agents Today',
    blocks: [
      {
        type: 'figure',
        src: '/images/articles/fig-market-1.webp',
        alt: 'Market map of the AI agent control landscape',
        caption: 'Market map',
      },
      lead(
        'The first approach is prompt-level controls. ',
        "System prompt engineering defines agent behavior in natural language. Content policy filters block prohibited outputs. Prompt injection detectors catch attempts to override agent instructions through malicious inputs. Tools like NeuralTrust's Generative Application Firewall, Guardrails AI, and Benchspan's indirect prompt injection classifier operate primarily at this layer. NeuralTrust even reports blocking fifteen million attacks and monitoring over six thousand AI applications using this approach.",
      ),
      p(
        'However, prompt-level controls see what goes into and out of the model. They cannot see what the agent does with legitimate access. The PocketOS agent had a clean system prompt. It was doing what it was told. The Railway CLI token it found and used was not a prompt injection. It was a legitimate credential the agent discovered and acted on. No prompt filter would have intercepted the volumeDelete call. The agent had the access. The action was technically permitted. The database was gone.',
      ),
      lead(
        'The second approach is security posture management.',
        ' Before deployment, security teams audit agent configuration: which API keys the agent holds, which systems it can reach, which tools are available, which permissions it has been granted. This is the AI equivalent of cloud security posture management. Zenity has built the most developed product at this layer, with buildtime governance covering agent discovery, permission auditing, and configuration policy enforcement across Microsoft Copilot, Salesforce Agentforce, AWS Bedrock, and Google Vertex AI. Zenity reports Fortune 20 and Fortune 50 customers and was named by Gartner as the company to beat in AI agent governance, specifically for its posture and detection capabilities.',
      ),
      p(
        'Yet, posture management is a pre-deployment snapshot. Once the agent is running, posture management cannot intervene. A perfectly configured agent can still take unexpected actions when it encounters novel situations at runtime. And as PocketOS demonstrated, the most dangerous credentials are often the secondary tokens the agent discovers while executing. Posture management audits what you gave the agent. It cannot audit what the agent finds.',
      ),
      lead(
        'The third approach is observability tooling.',
        " LLM observability platforms trace prompts and completions, measure token costs, record latency, and run evaluations. They answer questions about what the model said. They do not answer questions about what the agent did in the six systems it touched after deciding what to say. Traditional application performance monitoring registers a successful API call with normal latency. From Datadog's perspective, nothing went wrong at PocketOS. The agent executed a command. The command returned a success response and metrics look clean.",
      ),
      p(
        "The problem here is retrospection. Observability tells you what happened. It cannot stop what is happening. WitnessAI, which has raised $85.5 million and reports 500 percent ARR growth, positions itself as the confidence layer for enterprise AI. Its platform monitors which agents are active, what MCP servers they access, what data they share, and detects anomalous patterns through an intent-based policy engine. This is genuinely more advanced than pure observability. But the product's own description of its agentic security capabilities, launched in January 2026, describes monitoring and detecting, not intercepting and enforcing at the execution moment. Judgment Labs ($32M raised, with Lightspeed leading both rounds) occupies this same layer, turning production agent behavior into continuous improvement signals through its Judgeval open-source framework. Cascade builds continuous evaluation infrastructure for autonomous systems, detecting behavioral drift in real time. Braintrust powers evaluation-driven development for teams like Perplexity and Airtable with CI/CD blocking. None of them stand between the agent and what it is about to do.",
      ),
      p(
        'What all three approaches share: they are either pre-execution or post-execution. The execution moment itself, the instant between when an agent decides to act and when the action reaches the target system, has no commercial governance product specifically built to intercept it at scale.',
      ),
      p(
        'The missing infrastructure governs what happens after the model decides to act. Not what did the model say, but what did the agent actually do. Did it stay within its permitted scope? Was a human approval required and was one requested? Can this action be reversed. What is the audit trail across a workflow that touched six enterprise systems in four minutes. Which agent, authorized by whom, with what scope, took which action at what time. These questions require a different product built on a different architecture aimed at a different buyer than anything that exists at meaningful scale today. This sits above LLM observability and application performance monitoring, they tell you what the model said and whether the service is running. This layer governs what the agent did with that output in the real world.',
      ),
    ],
  },
  {
    id: 'gap-market-left-open',
    toc: 'The Gap the Market Left Open',
    heading: 'The Gap the Market Left Open',
    blocks: [
      p(
        'In 2025, Palo Alto Networks acquired Protect AI for approximately $700 million. CrowdStrike acquired Pangea for $260 million and named the category AI Detection and Response. SentinelOne acquired Prompt Security for $180 million. Check Point acquired Lakera for $300 million. ServiceNow spent $11.6 billion on AI acquisitions and described the goal as building the AI control tower. Total cybersecurity M&A in 2025 reached $96 billion, a 270% increase from the prior year.',
      ),
      {
        type: 'figure',
        src: '/images/articles/fig-market-2.webp',
        alt: 'Market map of AI security acquisitions',
        caption: 'Market map. Source: Software Strategies Blog, 2026',
      },
      p(
        'Every major security platform now has an AI security acquisition. The category has been validated at the highest level. Yet the pure-play agent control segment raised less than $50 million over the same period. The acquisitions focused on what happens before the agent acts. Governing what agents do once they are inside production systems, merging code, approving invoices, initiating transactions remains largely unaddressed.',
      ),
      p(
        'The companies currently building toward this problem are early and narrowly capitalized relative to the scale of what they are attempting. Zenity has raised $55 million across two rounds, counts Fortune 20 and Fortune 50 enterprises as production customers, and was named by Gartner as the company to beat in AI agent governance; it covers the buildtime and detection layer but has not yet built post-execution enforcement. WitnessAI has raised $85.5 million total, reports 500% ARR growth in 2025, and is deployed across financial services, airlines, utilities, and telecommunications; it offers the strongest observability and intent-monitoring available today, but its January 2026 agentic security launch describes monitoring and detecting, not intercepting at the execution moment. The combined implied valuation of every pure-play company in this space is a fraction of a single one of those acquisitions. $96 billion moved through this category in a single year and the layer that governs what agents actually do in production received almost none of it. That is where the opportunity is.',
      ),
    ],
  },
  {
    id: 'the-architecture',
    toc: 'The Architecture',
    heading: 'The Architecture',
    blocks: [
      {
        type: 'figure',
        src: '/images/articles/fig-architecture.webp',
        alt: 'Diagram of an end-to-end agent control workflow',
        caption: 'How it works: one example end-to-end workflow',
      },
      p(
        'The control layer sits above tool integrations, which means it can intercept every consequential action before or as it executes. Because it sits below the application layer, a single control plane can govern agents across multiple business functions without being rebuilt per deployment. Value in infrastructure stacks concentrates at the layer that owns the most critical data, is hardest to replace once embedded, and creates the strongest switching costs. The agent control layer has a credible claim on all three.',
      ),
      p(
        'Architecturally, the strongest companies will likely converge on proxy-based interception layers that sit directly between agents and external systems, making governance non-optional and turning action telemetry into a durable data asset. SDK-based approaches require the agent to call the control plane explicitly; they are the lowest-friction integration and the easiest to bypass. Proxy-based architectures cannot be bypassed: every API request, credential issuance, and external action passes through the control plane by design. The companies that build on proxy architectures will be the hardest to displace once embedded.',
      ),
      p(
        'The closest structural analog is Datadog, which became indispensable not because it owned one layer, but because it aggregated telemetry across all of them as enterprise environments fragmented. Agent infrastructure will fragment the same way, across providers, orchestration frameworks, and systems of record. The control plane is the layer where that fragmentation becomes a single source of truth for the security team, internal audit, and the regulator.',
      ),
      p(
        'Foundation providers will solve single-vendor governance. They will not solve cross-vendor identity, audit, and policy across an enterprise running multiple models against dozens of systems of record. The defensible layer is built on top of all of them, and it is bought by the CISO and the General Counsel.',
      ),
    ],
  },
  {
    id: 'three-solution-types',
    toc: 'Three Solution Types',
    heading: 'Three Solution Types',
    blocks: [
      {
        type: 'figure',
        src: '/images/articles/fig-solution-types.webp',
        alt: 'Diagram of the three solution types: detection, prevention, governance',
        caption: 'How it works: one example end-to-end workflow',
      },
      lead(
        'Detection',
        " identifies that something went wrong. Behavioral anomaly scoring, pattern analysis, and alert generation establish baselines of normal agent behavior and flag deviations. Straiker's Defend AI operates at this layer with sub-300 millisecond latency and 98% reported accuracy. WitnessAI's intent-based policy engine uses semantic analysis to detect anomalous patterns. This is the fastest path to initial revenue in the category; it integrates into existing security workflows and justifies purchase in the language the security team already speaks.",
      ),
      lead(
        'Prevention',
        " intercepts agent actions at the moment of execution and enforces policy before the action completes. A policy engine sits between the agent orchestration layer and the tool integration layer. Every tool call, mergeToProduction, sendEmail, initiatePayment, is evaluated against a ruleset before it reaches its target. Open Policy Agent, the standard for policy enforcement in Kubernetes and API gateways, handles this decision in under 50 milliseconds. Microsoft's open-source Agent Governance Toolkit, released in April 2026, demonstrates the pattern at sub-millisecond latency. The commercial product that deploys it at enterprise scale does not yet exist.",
      ),
      p(
        'The most durable architectures will rely on task-scoped credentials and capability tokens that expire with the workflow itself, eliminating persistent permissions beyond the specific action being executed. When an orchestration system initiates a task, the agent receives a short-lived token scoped to what that task requires. When the task completes, all permissions are automatically revoked. No credential persists beyond the work that required it. That architecture eliminates the class of failure that caused PocketOS. The IETF is standardizing non-human identity protocols but has not yet produced a finalized standard for agentic AI. The company that commercializes task-scoped agent identity will own a foundational layer of the stack.',
      ),
      lead(
        'Governance',
        ' creates the complete, tamper-evident record of what every agent did, when, under whose authorization, and with what outcome. Prevention blocks the action. Governance makes the block auditable. A purpose-built agent audit log captures not just the API call but the business-level intent, the task authorization that permitted it, and the downstream effects. It must be append-only and cryptographically signed so that an auditor has certainty the record has not been modified after the fact.',
      ),
      p(
        'Governance is not static policy alone. Runtime signals matter just as much: repeated retries on the same tool call, unusual tool selection, permission escalation attempts, anomalous token spend, goal drift from baseline workflows, and context window saturation all become indicators that an agent session is moving outside expected bounds. A working governance layer composes these signals into weighted runtime decisions, not individual alerts. This is what separates a real-time control plane from a log aggregator with a dashboard.',
      ),
      p(
        "The buyer for governance products is compliance, legal, and ultimately the CFO and board. Once a vendor's audit logs become the evidentiary basis for a regulatory examination, replacing that vendor requires re-certifying the entire control environment from scratch. The switching cost is organizational and regulatory, so it is the highest-retention commercial position in the category.",
      ),
    ],
  },
  {
    id: 'opportunity-map',
    toc: 'Opportunity Map',
    heading: 'Opportunity Map',
    blocks: [
      p(
        'Current penetration of dedicated agent governance tooling across all high-risk enterprise workflows: under one percent. Approximately 50,000 enterprises are actively deploying agents in workflows where mistakes carry real financial or operational consequences. Total funding raised by pure-play agent control companies: under $50 million. Not every vertical needs the same product. The most important dimension is not the industry but the nature of the obligation driving the purchase.',
      ),
      {
        type: 'figure',
        src: '/images/articles/fig-opportunity.webp',
        alt: 'Opportunity map across enterprise verticals',
        caption: 'Opportunity Map',
      },
      {
        type: 'item',
        label: 'Healthcare administration',
        paras: [
          [
            t(
              'Agents running inside Epic, Cerner, and Veeva now handle prior authorization, clinical documentation, and revenue cycle management across thousands of health systems and covered entities. Any agent that touches a patient record is subject to existing access control and audit requirements today. The governance product that produces audit records in the format regulators actually examine does not yet exist.',
            ),
          ],
          [
            t(
              'Prior authorization costs $35 billion annually in US administrative labor and takes 14 to 30 days per request. AI agents can compress that to hours. A health system processing 50,000 prior authorizations annually at $700 in administrative cost each carries $35 million in addressable labor. Governance infrastructure that unlocks that deployment captures 1 to 2 percent of that automation value, producing $350K to $700K in annual contract value per health system. Across 5,000 large health systems, that is a $500 million to $1.5 billion market. The winning monetization model is annual subscription tied to regulatory audit cycles, because health system budget decisions are driven by regulatory liability and compliance obligations, making the purchase recurring by its structure. The channel is the clinical software partner ecosystem, where certification reaches every customer without a separate sales motion. The governance company that gets its audit trail format accepted as compliant evidence in a regulatory investigation becomes impossible to replace, because switching vendors means re-certifying the entire access control environment from scratch.',
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Finance and accounting',
        paras: [
          [
            t(
              'Agents running inside SAP, Oracle, NetSuite, and Bill.com now categorize transactions and process invoices at enterprises subject to audited financial controls. An AI agent participating in financial close or invoice approval is already in scope for annual examination today. No company is specifically positioned here. When regulators issue formal guidance on AI-driven financial workflows, this vertical moves from optional to mandatory overnight.',
            ),
          ],
          [
            t(
              "Manual invoice processing costs $12 to $15 each. AI agents process the same invoice for $2 to $4, an 80 percent cost reduction. An enterprise processing 500,000 invoices annually saves $4 million to $6.5 million in labor. Governance infrastructure that makes that automation auditable captures 2 to 3 percent of those savings, producing $80K to $195K in annual contract value per enterprise. Across 3,500 regulated enterprises, that is a $350 million to $1.75 billion market. The winning monetization model is annual subscription tied to the financial audit cycle, because the budget decision is driven by the annual examination date and the purchase becomes non-discretionary once an agent touches the books. The channel is major audit firms, where appearing in the audit report turns every client at that firm into a prospect without a separate sales motion. The governance company that gets named in the auditor's report locks in those relationships for the duration of the engagement, and switching means re-auditing prior-year compliance evidence from scratch.",
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Software engineering',
        paras: [
          [
            t(
              'Agents running inside GitHub, Cursor, and Devin write, test, and merge code with increasing autonomy across approximately 20,000 large enterprises with meaningful engineering teams. One agent action, a merge, a deployment, a schema migration, can cause a production outage or expose credentials at scale. The governance requirement is a hard boundary between staging and production that cannot be crossed without authorization. PocketOS failed on exactly this. Straiker and Benchspan are the most precisely positioned companies, and Gartner projects 40% of enterprise applications will include task-specific agents by end of 2026.',
            ),
          ],
          [
            t(
              'A single production outage costs $300K to $500K per hour. One prevented incident covers the entire annual contract before any efficiency benefit is counted. Senior engineers spend roughly 35 percent of their time on review, testing, and deployment coordination. At $150K in total compensation that is $52K per engineer annually in recoverable overhead, and a team of 100 carries $5.2 million in addressable labor. Governance infrastructure recovering 40 percent of that produces over $2 million in annual value per enterprise, putting the annual contract value in the $50K to $150K range. Across 20,000 engineering teams, that is a $1 billion to $3 billion market. The winning monetization model is developer-led entry at $50 to $150 per developer per month, expanding to an enterprise security contract once the security team notices the product already running in production. The channel is developer marketplaces and open-source tooling, converting to enterprise through the security buyer at scale. The governance company that embeds its check as a mandatory step before deployment wins, because once that gate is part of the workflow, removing it requires a formal security review that no engineering team volunteers to initiate.',
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Customer support',
        paras: [
          [
            t(
              'Agents running inside Salesforce, Zendesk, Intercom, and HubSpot now issue refunds, modify subscriptions, and send external communications across approximately 25,000 enterprises with meaningful support operations. An agent handling tens of thousands of interactions per day at a small error rate on financial authorization produces hundreds of unauthorized actions daily. The Head of Customer Success and General Counsel are the buyers. InfiniteWatch, backed by Base10, is the most specifically positioned company in this vertical.',
            ),
          ],
          [
            t(
              "At a 1 percent error rate on 10,000 daily refund interactions, an enterprise generates 100 unauthorized financial actions per day. At $50 average refund value that is $1.8 million in annual unauthorized outflows. Governance infrastructure that prevents those losses produces $30K to $100K in annual contract value per enterprise before labor savings enter the calculation. Across 25,000 enterprises with meaningful support operations, that is a $750 million to $2.5 billion market. The winning monetization model is per-interaction pricing at $0.05 to $0.15 per governed interaction, because it scales automatically with the customer's volume and aligns revenue directly with the operational risk being governed. Annual subscription works for the compliance buyer approaching from privacy regulation exposure. The channel is major CRM marketplaces, where a verified listing creates inbound from every enterprise deploying support agents. The governance company that makes its product configurable by the operations team without requiring engineering involvement wins this vertical, because governance tools built for engineers lose here when the operational buyer will not wait for a ticket.",
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Payments and treasury',
        paras: [
          [
            t(
              'When an agent can initiate a payment, the risk is no longer operational. It is financial and legal with immediate liability. Agents operating inside treasury systems and payment rails are beginning to initiate transfers, approve invoices, and manage cash positions across large enterprises. The governance product here is a financial controls product that must operate faster than the payment rail itself, with decisions happening in memory in under 200 milliseconds. No company is specifically building here. This is the largest and least developed market in the category.',
            ),
          ],
          [
            t(
              'Deepfake fraud targeting financial authorization workflows exceeded $200 million in losses in 2025. A single prevented fraudulent transfer covers the annual governance contract at most treasury operations. A treasury operation processing $5 billion annually in agent-initiated payments at 1 basis point in governance fee generates $500K per year, scaling automatically as payment volume grows. At current penetration levels across 2,000 large treasury operations, that path produces a $1 billion to $2 billion near-term market, scaling to $5 billion to $10 billion at maturity as transaction volumes and governance adoption grow. The winning monetization model is transaction-based pricing at 50 to 150 basis points on governed transaction value, because treasury teams think and budget in basis points on transaction volume, and the fee grows with the customer without renegotiation. The channel is treasury management platforms and banking partner networks, where a compliance module integration reaches every large enterprise treasury operation without a separate sales motion. The governance company that establishes the authorization protocol for agent-initiated payments as the industry standard wins this vertical outright. That is an acquisition by a major financial infrastructure platform at infrastructure multiples within five years, not a software exit.',
            ),
          ],
        ],
      },
    ],
  },
  {
    id: 'three-infrastructure-gaps',
    toc: 'Three Infrastructure Gaps',
    heading: 'Three Infrastructure Gaps',
    blocks: [
      {
        type: 'item',
        label: 'What becomes the system of record for agent actions?',
        paras: [
          [
            t(
              "Every enterprise deploying agents needs a canonical, tamper-evident log of what every agent did: which system was touched, what data was accessed, what decision was made, and under whose authorization. The company that becomes this system of record owns the compliance relationship permanently. Once regulators and auditors treat a vendor's records as the source of truth, replacing that vendor requires re-certifying the entire control environment from scratch. That product does not exist at commercial scale today.",
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Do agents need their own identity layer?',
        paras: [
          [
            t(
              'Every credential system in enterprise security was built on the assumption that you know what a workload will do before it runs. An agent is goal-directed and non-deterministic. Its permissions need to change dynamically with every task it executes. The correct architecture issues task-scoped, short-lived credentials at task initialization and revokes them when the task completes. No credential persists beyond the work that required it. The IETF is standardizing non-human identity protocols. That standard does not yet exist for agentic AI. The company that commercializes task-scoped agent identity will own a foundational layer of the stack.',
            ),
          ],
        ],
      },
      {
        type: 'item',
        label: 'Can agent actions be rolled back?',
        paras: [
          [
            t(
              'When an agent takes an incorrect irreversible action, there is no structured response. A payment requires a separate reversal. An email cannot be unsent. A code change may cascade before anyone notices. Every enterprise currently figures this out manually after an incident. The company that builds the structured compensating action registry owns the incident response relationship at enterprise scale.',
            ),
          ],
        ],
      },
    ],
  },
  {
    id: 'approval-workflows',
    toc: 'Will Approval Workflows Remain Human-in-the-Loop?',
    heading: 'Will Approval Workflows Remain Human-in-the-Loop?',
    blocks: [
      p(
        'Today, flagging high-risk agent actions for human review is manageable. At the volumes enterprises are moving toward, it is not. An agent handling thousands of consequential decisions per hour cannot route each one to a human without defeating the purpose of automation. The products built around real-time policy enforcement, where the agent checks its action against a ruleset before executing, will have a structural advantage that is very hard to close later. This is an architectural decision, and it has to be made at the beginning.',
      ),
      p(
        'When an agent action is escalated for review, the reviewer needs five things: what task the agent was executing, what action it intends to take, whether this is within its authorized scope, what the downstream consequences are, and whether it can be reversed. A governance product that escalates without surfacing all five is not giving the reviewer enough information to decide. They will either approve everything to clear the queue or escalate everything upward. Neither is governance. The product that gets this handoff right will define how enterprise agent oversight actually works.',
      ),
    ],
  },
  {
    id: 'what-are-we-looking-for',
    toc: 'What Are We Looking For?',
    heading: 'What Are We Looking For?',
    blocks: [
      p(
        'The winning company starts vertical and expands horizontal. A purely horizontal play at day one loses on distribution to established platform companies with existing enterprise relationships. A purely vertical play has a ceiling. The correct motion is vertical entry with horizontal infrastructure: start in software engineering where incidents are documented and buyers are educated, build the identity and audit layer that vertical requires, then sell that same infrastructure to healthcare, finance, and payments. The product does not change. The compliance surface and system-of-record integration change. That is the expansion path to the control plane.',
      ),
      p(
        'The next unicorn in this category may look less like a security product and more like a supervisor agent. An AI system that watches other AI agents, understands their intent, detects when they are drifting from their authorized scope, and intervenes before the action completes. The reason humans struggle to govern agents is that agents operate faster than human review cycles and in more systems simultaneously than any person can monitor. The answer is an AI native infrastructure layer that sits above the action layer, keeps a complete record of everything agents do, and is structured so that catastrophic mistakes become architecturally impossible rather than just unlikely. That product does not exist at commercial scale. The IETF is standardizing non-human identity protocols but has not finished. The window to define the commercial implementation of whatever standard emerges is open right now, and the company that closes that window owns the authentication and oversight layer of the entire agentic enterprise stack.',
      ),
      p(
        "Every vertical in this piece represents human labor that AI agents are beginning to replace or augment at scale. The governance layer is the condition that makes that transition trustworthy enough for enterprises to actually deploy. The largest public companies in the world are now disclosing agentic AI governance risks in their annual SEC filings, naming unauthorized agent actions, prompt injection, and hallucination-driven mistakes as material financial risks. That is not early-adopter language. That is every enterprise's legal obligation talking. The market is a governance fee on the labor transition itself, and that market is larger than the current cybersecurity market by an order of magnitude.",
      ),
      p(
        'The payments and treasury vertical has no commercial entrant today. Five percent penetration of 2,000 large treasury operations at $500K average ACV is $500 million in ARR from a single vertical alone, and the near-term market across all five verticals is $1 billion to $2 billion before payments reaches maturity. The company that establishes the standard for agent-initiated payment authorization will be acquired at infrastructure multiples within five years. The market is completely open. No one is there yet.',
      ),
      p(
        'We are looking for the company that builds this infrastructure once and makes it work across environments, not the one that rebuilds it for each vertical. The signals we look for: integration depth into the systems of record where agents act, not framework-level instrumentation sitting above the action layer; a policy enforcement mechanism that operates before execution, not only after logging; a data architecture that accumulates behavioral baselines as a proprietary asset over time; and a compliance surface that speaks the language of auditors and regulators, not only engineers.',
      ),
      p(
        'Pricing starts simple, per agent or per workflow, easy for a technical buyer to approve. It ends up risk-weighted: a company governing payment agents should pay substantially more than a company governing documentation agents, because the value of prevention is proportional to the financial consequence of the mistake. This is how insurance is priced, and it is how the most defensible governance products will eventually be priced. Near-term contract values range from $30K at the support-buyer level to $500K to $5M at the regulated financial services level. The serviceable market across the five highest-risk verticals is $400 million to $1.5 billion in the near term. Datadog reached $2.7 billion in annual revenue from a comparable infrastructure monitoring wedge. The agent control layer governs a risk surface that is both larger and more directly consequential.',
      ),
      p(
        'This gap will be closed by someone who sees what most people are still missing, that the real infrastructure layer of the agentic era is not the agent itself but the system that governs what it is allowed to do. If you are building that, or know exactly why no one has built it yet and believe you are the person who can, we want to meet you.',
      ),
    ],
  },
  {
    id: 'so-who-controls-the-agent',
    toc: 'So Who Controls the Agent?',
    heading: 'So Who Controls the Agent?',
    blocks: [
      p(
        'The defining infrastructure battle in enterprise AI will not be over who builds the smartest agent. It will be over who governs, controls, and records what agents are permitted to do once they are operating inside real enterprise systems.',
      ),
      p(
        'Right now, at most enterprises deploying agents in production, the answer is effectively no one. There is no policy layer enforcing what an agent is and is not permitted to do. There is no identity record tracking which agent, authorized by whom, with what scope, did what. There is no audit trail a regulator could examine. There is no real-time intervention between the agent and the action.',
      ),
      p(
        'The company that becomes the system of record for agent actions will be building the control plane of the agentic enterprise. Control planes get embedded, depended on, and eventually taken for granted as infrastructure, which is exactly when they become the most valuable thing in the stack.',
      ),
      p(
        'We know this gap will be closed. We are looking for the founders who see it and believe they have the tools and the conviction to close it. If that is you, we want to hear from you.',
      ),
    ],
  },
]
