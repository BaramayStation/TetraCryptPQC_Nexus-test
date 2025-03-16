/**
 * TetraCryptPQC AI-Powered Quantum-Resistant Voting System
 * 
 * Implements a secure, decentralized voting system with AI-driven security,
 * post-quantum cryptography, and offline resilience for enterprise governance.
 */

import { AISecurityMode, PQCAlgorithmPreference, aiSecurityOrchestrator } from './ai-security-orchestrator';
import { SecurityZone } from './security-zone-manager';
import { generateMLKEMKeypair, generateSLHDSAKeypair } from './pqcrypto';
import { StarkNetClient } from './starknet-client';
import { IPFSStorage } from './decentralized-storage';
import { PodmanContainer } from './podman-security';
import { aiQuantumIdentity, IdentityDocument } from './ai-quantum-identity';

// Vote States
export enum VoteState {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
  TALLYING = 'tallying',
  FINALIZED = 'finalized',
  DISPUTED = 'disputed'
}

// Vote Types
export enum VoteType {
  SINGLE_CHOICE = 'single-choice',
  MULTIPLE_CHOICE = 'multiple-choice',
  RANKED_CHOICE = 'ranked-choice',
  QUADRATIC = 'quadratic',
  WEIGHTED = 'weighted'
}

// Vote Privacy Level
export enum VotePrivacyLevel {
  PUBLIC = 'public',
  ANONYMOUS = 'anonymous',
  ZERO_KNOWLEDGE = 'zero-knowledge'
}

/**
 * Vote Proposal Interface
 */
export interface VoteProposal {
  id: string;
  title: string;
  description: string;
  type: VoteType;
  privacyLevel: VotePrivacyLevel;
  options: string[];
  state: VoteState;
  creator: string;
  securityZone: SecurityZone;
  startTime: Date;
  endTime: Date;
  minVoters: number;
  requiredMajority: number;
  weightingStrategy?: string;
  zkProof?: string;
  metadata: {
    created: Date;
    updated: Date;
    finalized?: Date;
  };
}

/**
 * Vote Ballot Interface
 */
export interface VoteBallot {
  id: string;
  proposalId: string;
  voter: string;
  choices: number[];
  weight: number;
  timestamp: Date;
  signature: string;
  zkProof?: string;
  encryptedData?: string;
}

/**
 * Vote Results Interface
 */
export interface VoteResults {
  proposalId: string;
  state: VoteState;
  totalVotes: number;
  optionResults: {
    [key: number]: number;
  };
  winningOptions: number[];
  quorumReached: boolean;
  majorityReached: boolean;
  zkProof: string;
  timestamp: Date;
}

/**
 * Voting System Configuration
 */
export interface VotingSystemConfig {
  mode: AISecurityMode;
  pqcPreference: PQCAlgorithmPreference;
  enableOfflineVoting: boolean;
  enableZKVoting: boolean;
  minVotingPeriod: number;
  maxVotingPeriod: number;
  defaultQuorum: number;
  defaultMajority: number;
  autoTallyResults: boolean;
  disputePeriod: number;
}

/**
 * AI-Powered Quantum-Resistant Voting System
 */
export class AIQuantumVoting {
  private config: VotingSystemConfig;
  private starkNet: StarkNetClient;
  private ipfs: IPFSStorage;
  private podman: PodmanContainer;
  private proposals: Map<string, VoteProposal>;
  private ballots: Map<string, VoteBallot[]>;
  private results: Map<string, VoteResults>;
  private offlineBallots: Map<string, VoteBallot[]>;
  private tallyJobs: Set<string>;

  constructor(config: Partial<VotingSystemConfig> = {}) {
    this.config = {
      mode: AISecurityMode.AUTONOMOUS,
      pqcPreference: PQCAlgorithmPreference.DYNAMIC,
      enableOfflineVoting: true,
      enableZKVoting: true,
      minVotingPeriod: 24 * 60 * 60 * 1000, // 24 hours
      maxVotingPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      defaultQuorum: 0.5, // 50%
      defaultMajority: 0.66, // 66%
      autoTallyResults: true,
      disputePeriod: 48 * 60 * 60 * 1000, // 48 hours
      ...config
    };

    this.proposals = new Map();
    this.ballots = new Map();
    this.results = new Map();
    this.offlineBallots = new Map();
    this.tallyJobs = new Set();
  }

  /**
   * Initialize the voting system
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("🔹 Initializing AI-Powered Quantum Voting System");

      // Initialize StarkNet client
      this.starkNet = new StarkNetClient();
      await this.starkNet.initialize();

      // Initialize IPFS storage
      this.ipfs = new IPFSStorage();
      await this.ipfs.initialize();

      // Initialize Podman
      this.podman = new PodmanContainer();
      await this.podman.initialize();

      console.log("✅ AI Quantum Voting System initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize AI Quantum Voting System:", error);
      return false;
    }
  }

  /**
   * Create a new vote proposal
   */
  public async createProposal(
    title: string,
    description: string,
    options: string[],
    config: {
      type?: VoteType;
      privacyLevel?: VotePrivacyLevel;
      securityZone?: SecurityZone;
      startTime?: Date;
      endTime?: Date;
      minVoters?: number;
      requiredMajority?: number;
      weightingStrategy?: string;
    } = {}
  ): Promise<VoteProposal> {
    try {
      // Generate proposal ID
      const proposalId = crypto.randomUUID();

      // Validate timing
      const now = new Date();
      const startTime = config.startTime || now;
      const endTime = config.endTime || new Date(startTime.getTime() + this.config.minVotingPeriod);

      if (endTime.getTime() - startTime.getTime() < this.config.minVotingPeriod) {
        throw new Error("Voting period too short");
      }

      if (endTime.getTime() - startTime.getTime() > this.config.maxVotingPeriod) {
        throw new Error("Voting period too long");
      }

      // Create proposal
      const proposal: VoteProposal = {
        id: proposalId,
        title,
        description,
        type: config.type || VoteType.SINGLE_CHOICE,
        privacyLevel: config.privacyLevel || VotePrivacyLevel.ZERO_KNOWLEDGE,
        options,
        state: VoteState.DRAFT,
        creator: await this.getCurrentUserId(),
        securityZone: config.securityZone || SecurityZone.RESTRICTED,
        startTime,
        endTime,
        minVoters: config.minVoters || Math.ceil(await this.getEligibleVoterCount() * this.config.defaultQuorum),
        requiredMajority: config.requiredMajority || this.config.defaultMajority,
        weightingStrategy: config.weightingStrategy,
        metadata: {
          created: now,
          updated: now
        }
      };

      // Generate zero-knowledge proof if enabled
      if (this.config.enableZKVoting) {
        proposal.zkProof = await this.generateProposalProof(proposal);
      }

      // Store proposal
      await this.storeProposal(proposal);

      // Schedule vote start
      this.scheduleVoteStart(proposal);

      return proposal;
    } catch (error) {
      console.error("Failed to create proposal:", error);
      throw error;
    }
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string> {
    return await this.starkNet.getCurrentUserId();
  }

  /**
   * Get count of eligible voters
   */
  private async getEligibleVoterCount(): Promise<number> {
    return await this.starkNet.getEligibleVoterCount();
  }

  /**
   * Generate zero-knowledge proof for proposal
   */
  private async generateProposalProof(proposal: VoteProposal): Promise<string> {
    return await this.starkNet.generateZKProof({
      type: 'vote-proposal',
      id: proposal.id,
      creator: proposal.creator,
      options: proposal.options,
      timestamp: Date.now()
    });
  }

  /**
   * Store proposal
   */
  private async storeProposal(proposal: VoteProposal): Promise<void> {
    // Store in memory
    this.proposals.set(proposal.id, proposal);

    // Store on StarkNet
    await this.starkNet.storeProposal(proposal);

    // Store on IPFS for redundancy
    await this.ipfs.addProposal(proposal);
  }

  /**
   * Schedule vote start
   */
  private scheduleVoteStart(proposal: VoteProposal): void {
    const delay = proposal.startTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.startVote(proposal.id);
      }, delay);
    } else {
      // Start immediately
      this.startVote(proposal.id);
    }
  }

  /**
   * Start a vote
   */
  private async startVote(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    try {
      // Update state
      proposal.state = VoteState.ACTIVE;
      proposal.metadata.updated = new Date();

      // Store updated proposal
      await this.storeProposal(proposal);

      // Schedule vote end
      const delay = proposal.endTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          await this.endVote(proposalId);
        }, delay);
      }
    } catch (error) {
      console.error(`Failed to start vote ${proposalId}:`, error);
    }
  }

  /**
   * Cast a vote
   */
  public async castVote(
    proposalId: string,
    choices: number[],
    voterIdentity: IdentityDocument
  ): Promise<VoteBallot> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.state !== VoteState.ACTIVE) {
      throw new Error("Vote is not active");
    }

    try {
      // Validate voter eligibility
      await this.validateVoter(voterIdentity, proposal);

      // Create ballot
      const ballot: VoteBallot = {
        id: crypto.randomUUID(),
        proposalId,
        voter: voterIdentity.did,
        choices,
        weight: await this.calculateVoteWeight(voterIdentity, proposal),
        timestamp: new Date(),
        signature: '',
        zkProof: '',
        encryptedData: ''
      };

      // Sign ballot
      ballot.signature = await this.signBallot(ballot, voterIdentity);

      // Generate zero-knowledge proof if enabled
      if (proposal.privacyLevel === VotePrivacyLevel.ZERO_KNOWLEDGE) {
        ballot.zkProof = await this.generateBallotProof(ballot, voterIdentity);
      }

      // Encrypt ballot data if anonymous
      if (proposal.privacyLevel === VotePrivacyLevel.ANONYMOUS) {
        ballot.encryptedData = await this.encryptBallot(ballot);
      }

      // Store ballot
      await this.storeBallot(ballot, proposal);

      return ballot;
    } catch (error) {
      console.error(`Failed to cast vote for ${proposalId}:`, error);
      throw error;
    }
  }

  /**
   * Validate voter eligibility
   */
  private async validateVoter(
    voter: IdentityDocument,
    proposal: VoteProposal
  ): Promise<void> {
    // Check identity state
    if (voter.state !== 'verified') {
      throw new Error("Voter identity not verified");
    }

    // Check security zone access
    const hasAccess = await aiSecurityOrchestrator.validateZoneAccess(
      voter.did,
      proposal.securityZone
    );
    if (!hasAccess) {
      throw new Error("Voter does not have required security zone access");
    }

    // Check if already voted
    const existingBallots = this.ballots.get(proposal.id) || [];
    if (existingBallots.some(b => b.voter === voter.did)) {
      throw new Error("Voter has already cast a ballot");
    }
  }

  /**
   * Calculate vote weight
   */
  private async calculateVoteWeight(
    voter: IdentityDocument,
    proposal: VoteProposal
  ): Promise<number> {
    if (!proposal.weightingStrategy) {
      return 1; // Default equal weight
    }

    // Calculate weight based on strategy
    return await aiSecurityOrchestrator.calculateVoteWeight(
      voter,
      proposal.weightingStrategy
    );
  }

  /**
   * Sign ballot
   */
  private async signBallot(
    ballot: VoteBallot,
    voter: IdentityDocument
  ): Promise<string> {
    const ballotData = {
      id: ballot.id,
      proposalId: ballot.proposalId,
      choices: ballot.choices,
      weight: ballot.weight,
      timestamp: ballot.timestamp
    };

    return await this.starkNet.signData(ballotData, voter.did);
  }

  /**
   * Generate zero-knowledge proof for ballot
   */
  private async generateBallotProof(
    ballot: VoteBallot,
    voter: IdentityDocument
  ): Promise<string> {
    return await this.starkNet.generateZKProof({
      type: 'vote-ballot',
      ballotId: ballot.id,
      proposalId: ballot.proposalId,
      voterDid: voter.did,
      timestamp: ballot.timestamp
    });
  }

  /**
   * Encrypt ballot data
   */
  private async encryptBallot(ballot: VoteBallot): Promise<string> {
    const ballotData = {
      choices: ballot.choices,
      weight: ballot.weight
    };

    // Generate ML-KEM keys for encryption
    const keys = await generateMLKEMKeypair();

    // Encrypt ballot data
    return await aiSecurityOrchestrator.encryptWithMLKEM(
      JSON.stringify(ballotData),
      keys.publicKey
    );
  }

  /**
   * Store ballot
   */
  private async storeBallot(ballot: VoteBallot, proposal: VoteProposal): Promise<void> {
    // Check if online
    const isOnline = await this.checkNetworkStatus();

    if (!isOnline && this.config.enableOfflineVoting) {
      // Store in offline queue
      const offlineBallots = this.offlineBallots.get(proposal.id) || [];
      offlineBallots.push(ballot);
      this.offlineBallots.set(proposal.id, offlineBallots);
    } else {
      // Store in regular ballot collection
      const ballots = this.ballots.get(proposal.id) || [];
      ballots.push(ballot);
      this.ballots.set(proposal.id, ballots);

      // Store on StarkNet
      await this.starkNet.storeBallot(ballot);

      // Store on IPFS for redundancy
      await this.ipfs.addBallot(ballot);
    }
  }

  /**
   * Check network status
   */
  private async checkNetworkStatus(): Promise<boolean> {
    try {
      return await this.starkNet.checkConnection();
    } catch {
      return false;
    }
  }

  /**
   * End a vote
   */
  private async endVote(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.state !== VoteState.ACTIVE) return;

    try {
      // Update state
      proposal.state = VoteState.ENDED;
      proposal.metadata.updated = new Date();

      // Store updated proposal
      await this.storeProposal(proposal);

      // Sync offline ballots if any
      if (this.offlineBallots.has(proposalId)) {
        await this.syncOfflineBallots(proposalId);
      }

      // Auto-tally results if enabled
      if (this.config.autoTallyResults) {
        await this.tallyResults(proposalId);
      }
    } catch (error) {
      console.error(`Failed to end vote ${proposalId}:`, error);
    }
  }

  /**
   * Sync offline ballots
   */
  private async syncOfflineBallots(proposalId: string): Promise<void> {
    const offlineBallots = this.offlineBallots.get(proposalId) || [];
    if (offlineBallots.length === 0) return;

    console.log(`🔄 Syncing ${offlineBallots.length} offline ballots for proposal ${proposalId}`);

    for (const ballot of offlineBallots) {
      try {
        // Verify ballot is still valid
        const voter = await aiQuantumIdentity.getIdentity(ballot.voter);
        if (!voter) continue;

        // Store ballot normally
        const ballots = this.ballots.get(proposalId) || [];
        ballots.push(ballot);
        this.ballots.set(proposalId, ballots);

        // Store on StarkNet
        await this.starkNet.storeBallot(ballot);

        // Store on IPFS
        await this.ipfs.addBallot(ballot);
      } catch (error) {
        console.error(`Failed to sync offline ballot ${ballot.id}:`, error);
      }
    }

    // Clear offline ballots
    this.offlineBallots.delete(proposalId);
  }

  /**
   * Tally vote results
   */
  public async tallyResults(proposalId: string): Promise<VoteResults> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.state !== VoteState.ENDED) {
      throw new Error("Vote has not ended");
    }

    if (this.tallyJobs.has(proposalId)) {
      throw new Error("Results are already being tallied");
    }

    try {
      // Add to tally jobs
      this.tallyJobs.add(proposalId);

      // Update proposal state
      proposal.state = VoteState.TALLYING;
      await this.storeProposal(proposal);

      // Get all ballots
      const ballots = this.ballots.get(proposalId) || [];

      // Calculate results
      const results = await this.calculateResults(proposal, ballots);

      // Store results
      await this.storeResults(results);

      // Update proposal state
      proposal.state = VoteState.FINALIZED;
      proposal.metadata.finalized = new Date();
      await this.storeProposal(proposal);

      // Remove from tally jobs
      this.tallyJobs.delete(proposalId);

      return results;
    } catch (error) {
      console.error(`Failed to tally results for ${proposalId}:`, error);
      
      // Update proposal state
      proposal.state = VoteState.DISPUTED;
      await this.storeProposal(proposal);
      
      throw error;
    }
  }

  /**
   * Calculate vote results
   */
  private async calculateResults(
    proposal: VoteProposal,
    ballots: VoteBallot[]
  ): Promise<VoteResults> {
    // Initialize results
    const results: VoteResults = {
      proposalId: proposal.id,
      state: VoteState.FINALIZED,
      totalVotes: ballots.length,
      optionResults: {},
      winningOptions: [],
      quorumReached: false,
      majorityReached: false,
      zkProof: '',
      timestamp: new Date()
    };

    // Calculate votes for each option
    for (const ballot of ballots) {
      for (const choice of ballot.choices) {
        results.optionResults[choice] = (results.optionResults[choice] || 0) + ballot.weight;
      }
    }

    // Calculate winning options
    const totalWeight = Object.values(results.optionResults).reduce((a, b) => a + b, 0);
    const sortedOptions = Object.entries(results.optionResults)
      .sort(([, a], [, b]) => b - a)
      .map(([option]) => parseInt(option));

    results.winningOptions = sortedOptions;

    // Check quorum
    results.quorumReached = ballots.length >= proposal.minVoters;

    // Check majority
    if (results.quorumReached && results.optionResults[sortedOptions[0]]) {
      results.majorityReached = results.optionResults[sortedOptions[0]] / totalWeight >= proposal.requiredMajority;
    }

    // Generate zero-knowledge proof
    results.zkProof = await this.generateResultsProof(results);

    return results;
  }

  /**
   * Generate zero-knowledge proof for results
   */
  private async generateResultsProof(results: VoteResults): Promise<string> {
    return await this.starkNet.generateZKProof({
      type: 'vote-results',
      proposalId: results.proposalId,
      totalVotes: results.totalVotes,
      optionResults: results.optionResults,
      timestamp: results.timestamp
    });
  }

  /**
   * Store vote results
   */
  private async storeResults(results: VoteResults): Promise<void> {
    // Store in memory
    this.results.set(results.proposalId, results);

    // Store on StarkNet
    await this.starkNet.storeResults(results);

    // Store on IPFS for redundancy
    await this.ipfs.addResults(results);
  }

  /**
   * Get voting system status
   */
  public getStatus(): {
    activeProposals: number;
    endedProposals: number;
    totalBallots: number;
    offlineBallots: number;
    tallyJobs: number;
  } {
    const activeProposals = Array.from(this.proposals.values())
      .filter(p => p.state === VoteState.ACTIVE).length;

    const endedProposals = Array.from(this.proposals.values())
      .filter(p => p.state === VoteState.ENDED || p.state === VoteState.FINALIZED).length;

    const totalBallots = Array.from(this.ballots.values())
      .reduce((sum, ballots) => sum + ballots.length, 0);

    const offlineBallots = Array.from(this.offlineBallots.values())
      .reduce((sum, ballots) => sum + ballots.length, 0);

    return {
      activeProposals,
      endedProposals,
      totalBallots,
      offlineBallots,
      tallyJobs: this.tallyJobs.size
    };
  }
}

// Export singleton instance
export const aiQuantumVoting = new AIQuantumVoting({});
