// src/core/proxy/__tests__/proxy.service.test.js
const ProxyService = require("../proxy.service");
const ProxyValidator = require("../proxy.validator");
const ProxyPool = require("../proxy.pool");

// Mock validator
jest.mock("../proxy.validator");
jest.mock("axios");

describe("ProxyService", () => {
  let proxyService;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock validator response
    ProxyValidator.mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue(true),
    }));

    proxyService = new ProxyService(mockLogger);
  });

  describe("getWorkingProxy", () => {
    it("should return a working proxy from pool if available", async () => {
      const workingProxy = {
        server: "http://11.22.33.44:8080",
        type: "http",
        source: "test",
      };

      // Add to pool and force validate
      proxyService.pool.add(workingProxy);
      proxyService.validator.validate.mockResolvedValueOnce(true);

      const result = await proxyService.getWorkingProxy();
      expect(result).toEqual(workingProxy);
      expect(proxyService.validator.validate).toHaveBeenCalledWith(
        workingProxy
      );
    });

    it("should fetch new proxies when pool is empty", async () => {
      const testProxy = {
        server: "http://55.66.77.88:8080",
        type: "http",
        source: "speedx",
      };

      // Mock provider to return test proxy
      proxyService.providers[0].getProxy = jest
        .fn()
        .mockResolvedValue([testProxy]);
      proxyService.validator.validate.mockResolvedValueOnce(true);

      const result = await proxyService.getWorkingProxy();
      expect(result).toEqual(testProxy);
      expect(proxyService.pool.getWorking()).toContainEqual(testProxy);
    });

    it("should throw error when no working proxies found", async () => {
      proxyService.validator.validate.mockResolvedValue(false);
      await expect(proxyService.getWorkingProxy()).rejects.toThrow(
        "No working proxy found"
      );
    });
  });
});
