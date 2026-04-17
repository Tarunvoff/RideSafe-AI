import { Test, TestingModule } from '@nestjs/testing';
import { PayoutService } from './payout.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { RedisStateService } from '../state/redis-state.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('../compliance/driver-eligibility.util', () => ({
  assertDriverPolicyEligibility: jest.fn().mockResolvedValue(true),
}));

describe('PayoutService', () => {
  let service: PayoutService;
  let prisma: PrismaService;
  let payments: PaymentsService;
  let redisState: RedisStateService;

  const mockPrisma = {
    policy: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    disruptionEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payout: {
      findUnique: jest.fn(),
    },
    payoutIdempotencyKey: {
      findUnique: jest.fn(),
    },
  };

  const mockPayments = {
    processParametricPayout: jest.fn(),
  };

  const mockRedisState = {
    getDriverState: jest.fn(),
    getZoneState: jest.fn(),
    getPolicyState: jest.fn(),
    pushPayoutRetry: jest.fn(),
  };

  const mockDynamicQCommerce = {
    getDriverProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: RedisStateService, useValue: mockRedisState },
        { provide: DynamicQCommerceService, useValue: mockDynamicQCommerce },
      ],
    }).compile();

    service = module.get<PayoutService>(PayoutService);
    prisma = module.get<PrismaService>(PrismaService);
    payments = module.get<PaymentsService>(PaymentsService);
    redisState = module.get<RedisStateService>(RedisStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPayout', () => {
    const mockDriverId = 'driver_123';
    const mockPolicyId = 'policy_456';
    const mockH3Cell = '8861892433fffff';

    it('should throw NotFoundException if no policy is found', async () => {
      mockPrisma.policy.findUnique.mockResolvedValue(null);
      await expect(service.processPayout({ driverId: mockDriverId, policyId: mockPolicyId }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if policy zone mismatch', async () => {
      mockPrisma.policy.findUnique.mockResolvedValue({
        id: mockPolicyId,
        userId: mockDriverId,
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 86400000),
        startDate: new Date(Date.now() - 86400000),
        planType: 'STANDARD',
      });
      mockRedisState.getPolicyState.mockResolvedValue({ zone: 'wrong_zone' });
      
      await expect(service.processPayout({ driverId: mockDriverId, policyId: mockPolicyId, h3Cell: mockH3Cell }))
        .rejects.toThrow(BadRequestException);
    });

    it('should return cached payout if it already exists', async () => {
      mockPrisma.policy.findUnique.mockResolvedValue({
        id: mockPolicyId,
        userId: mockDriverId,
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 86400000),
        startDate: new Date(Date.now() - 86400000),
        planType: 'PREMIUM',
      });
      mockRedisState.getPolicyState.mockResolvedValue({ zone: mockH3Cell });
      mockRedisState.getZoneState.mockResolvedValue({ zone_state: 'HALTED' });
      
      mockPrisma.disruptionEvent.findFirst.mockResolvedValue({ id: 'event_789' });
      mockPrisma.payout.findUnique.mockResolvedValue({
        id: 'payout_000',
        transactionId: 'tx_999',
        approvedPayout: 1000,
      });

      const result = await service.processPayout({ 
        driverId: mockDriverId, 
        policyId: mockPolicyId, 
        h3Cell: mockH3Cell,
        payoutAmount: 1000 
      });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.transactionId).toBe('tx_999');
    });
  });
});
