import { Test, TestingModule } from '@nestjs/testing';
import { InsuranceService } from './insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { RedisStateService } from '../state/redis-state.service';
import { FraudIntegrationService } from '../fraud-integration/fraud-integration.service';
import { PayoutService } from '../payout/payout.service';
import { PremiumService } from '../premium/premium.service';
import { TriggerService } from '../trigger/trigger.service';
import { BadRequestException } from '@nestjs/common';

// Define the mock for assertDriverPolicyEligibility
jest.mock('../compliance/driver-eligibility.util', () => ({
  assertDriverPolicyEligibility: jest.fn().mockResolvedValue(true),
}));

describe('InsuranceService', () => {
  let service: InsuranceService;
  let prisma: PrismaService;
  let redisState: RedisStateService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    policy: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    weeklyPlan: {
      findUnique: jest.fn(),
    },
  };

  const mockDynamicQCommerce = {
    getDriverProfile: jest.fn(),
  };

  const mockRedisState = {
    getDriverState: jest.fn(),
    getZoneState: jest.fn(),
    getPolicyState: jest.fn(),
    setPolicyState: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DynamicQCommerceService, useValue: mockDynamicQCommerce },
        { provide: RedisStateService, useValue: mockRedisState },
        { provide: FraudIntegrationService, useValue: {} },
        { provide: PayoutService, useValue: {} },
        { provide: PremiumService, useValue: {} },
        { provide: TriggerService, useValue: {} },
      ],
    }).compile();

    service = module.get<InsuranceService>(InsuranceService);
    prisma = module.get<PrismaService>(PrismaService);
    redisState = module.get<RedisStateService>(RedisStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enrollPolicy', () => {
    it('should throw BadRequestException if plan is invalid', async () => {
      await expect(service.enrollPolicy({ driverId: 'd1', plan: 'INVALID' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should enroll a valid policy with a 24-hour cooling-off period', async () => {
      const driverId = 'd1';
      const plan = 'STANDARD';
      
      mockPrisma.user.findUnique.mockResolvedValue({ id: driverId });
      mockDynamicQCommerce.getDriverProfile.mockResolvedValue({ 
        driverProfile: { 
          currentWeek: { weeklyEarningsTotal: 10000 },
          identity: { provider: 'BLINKIT' }
        }
      });
      mockRedisState.getDriverState.mockResolvedValue({ 
        last_location: { h3_cell: 'h1', lat: 13.0, lng: 80.0 } 
      });
      
      mockPrisma.policy.create.mockResolvedValue({ id: 'p1', planType: plan });

      const result = await service.enrollPolicy({ driverId, plan });

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.policy.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: driverId,
          planType: plan,
          startDate: expect.any(Date),
        })
      }));

      const startDate = mockPrisma.policy.create.mock.calls[0][0].data.startDate;
      const now = new Date();
      const diffHours = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.9); // Cooling-off 24h
    });
  });
});
