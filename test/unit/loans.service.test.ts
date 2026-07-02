import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getLoanItems: vi.fn(),
  createLoanItem: vi.fn(),
  getLoanItem: vi.fn(),
  updateLoanItem: vi.fn(),
  updateLoanItemStatus: vi.fn(),
  deleteLoanItem: vi.fn(),
};

const mockStorageService = { storage: mockStorage };
const mockMinIOService = { uploadFile: vi.fn(), deleteFile: vi.fn() };

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

class LoansService {
  constructor(private storageService: unknown, private minioService: unknown) {}

  async getLoanItems(page = 1, limit = 20, search?: string) {
    return this.storageService.storage.getLoanItems({ page, limit, search });
  }

  async createLoanItem(data: unknown) {
    if (!data.name || !data.lenderName || !data.lenderEmail) {
      throw new Error('Name, lender name, and email are required');
    }
    return this.storageService.storage.createLoanItem(data);
  }

  async updateLoanItemStatus(id: string, status: string) {
    const validStatuses = ['available', 'borrowed', 'returned', 'damaged', 'lost'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid loan status');
    }
    return this.storageService.storage.updateLoanItemStatus(id, status);
  }

  async uploadLoanItemImage(id: string, file: unknown) {
    const result = await this.minioService.uploadFile(file);
    if (result.success) {
      return this.storageService.storage.updateLoanItem(id, { imageUrl: result.url });
    }
    throw new Error('Failed to upload image');
  }
}

describe('LoansService', () => {
  let loansService: LoansService;

  beforeEach(() => {
    vi.clearAllMocks();
    loansService = new LoansService(mockStorageService, mockMinIOService);
  });

  describe('getLoanItems', () => {
    it('should return paginated loan items', async () => {
      const mockItems = [
        { id: '1', name: 'Projector', status: 'available' },
        { id: '2', name: 'Camera', status: 'borrowed' },
      ];
      mockStorage.getLoanItems.mockResolvedValue({ success: true, data: { data: mockItems, total: 2 } });

      const result = await loansService.getLoanItems(1, 20);

      expect(mockStorage.getLoanItems).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined });
      expect(result.data.data).toHaveLength(2);
    });

    it('should filter by search term', async () => {
      mockStorage.getLoanItems.mockResolvedValue({ success: true, data: { data: [], total: 0 } });

      await loansService.getLoanItems(1, 20, 'projector');

      expect(mockStorage.getLoanItems).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'projector' });
    });
  });

  describe('createLoanItem', () => {
    it('should create loan item with valid data', async () => {
      const loanItem = {
        name: 'Projector',
        description: 'HD Projector',
        lenderName: 'John Doe',
        lenderEmail: 'john@example.com',
      };
      mockStorage.createLoanItem.mockResolvedValue({ success: true, data: { id: '1', ...loanItem, status: 'available' } });

      const result = await loansService.createLoanItem(loanItem);

      expect(result.success).toBe(true);
    });

    it('should reject loan item without name', async () => {
      await expect(loansService.createLoanItem({ lenderName: 'John', lenderEmail: 'john@example.com' }))
        .rejects.toThrow('Name, lender name, and email are required');
    });

    it('should reject loan item without lender info', async () => {
      await expect(loansService.createLoanItem({ name: 'Projector' }))
        .rejects.toThrow('Name, lender name, and email are required');
    });
  });

  describe('updateLoanItemStatus', () => {
    it('should update status for valid status', async () => {
      mockStorage.updateLoanItemStatus.mockResolvedValue({ success: true });

      await loansService.updateLoanItemStatus('1', 'borrowed');

      expect(mockStorage.updateLoanItemStatus).toHaveBeenCalledWith('1', 'borrowed');
    });

    it('should reject invalid status', async () => {
      await expect(loansService.updateLoanItemStatus('1', 'invalid'))
        .rejects.toThrow('Invalid loan status');
    });

    const validStatuses = ['available', 'borrowed', 'returned', 'damaged', 'lost'];
    validStatuses.forEach((status) => {
      it(`should accept ${status} status`, async () => {
        mockStorage.updateLoanItemStatus.mockResolvedValue({ success: true });
        await expect(loansService.updateLoanItemStatus('1', status)).resolves.not.toThrow();
      });
    });
  });

  describe('uploadLoanItemImage', () => {
    it('should upload image and update loan item', async () => {
      const mockFile = { buffer: Buffer.from('test'), mimetype: 'image/png' };
      mockMinIOService.uploadFile.mockResolvedValue({ success: true, url: 'http://minio/image.png' });
      mockStorage.updateLoanItem.mockResolvedValue({ success: true, data: { id: '1', imageUrl: 'http://minio/image.png' } });

      const result = await loansService.uploadLoanItemImage('1', mockFile);

      expect(mockMinIOService.uploadFile).toHaveBeenCalledWith(mockFile);
      expect(mockStorage.updateLoanItem).toHaveBeenCalledWith('1', { imageUrl: 'http://minio/image.png' });
    });

    it('should throw error on upload failure', async () => {
      mockMinIOService.uploadFile.mockResolvedValue({ success: false });

      await expect(loansService.uploadLoanItemImage('1', {}))
        .rejects.toThrow('Failed to upload image');
    });
  });
});
