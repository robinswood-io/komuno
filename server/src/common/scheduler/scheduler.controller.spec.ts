import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulerController } from './scheduler.controller';
import { TaskReminderService } from './task-reminder.service';

type TriggerManually = TaskReminderService['triggerManually'];

describe('SchedulerController', () => {
  let controller: SchedulerController;
  let triggerManuallyMock: ReturnType<typeof vi.fn<TriggerManually>>;

  beforeEach(() => {
    triggerManuallyMock = vi.fn<TriggerManually>();

    controller = new SchedulerController({
      triggerManually: triggerManuallyMock,
    } as unknown as TaskReminderService);
  });

  describe('triggerReminders', () => {
    it('should return success with tasksFound from service', async () => {
      triggerManuallyMock.mockResolvedValueOnce({ tasksFound: 4 });

      const result = await controller.triggerReminders();

      expect(result).toEqual({ success: true, tasksFound: 4 });
      expect(triggerManuallyMock).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('scheduler trigger failed');
      triggerManuallyMock.mockRejectedValueOnce(error);

      await expect(controller.triggerReminders()).rejects.toThrow(
        'scheduler trigger failed',
      );
      expect(triggerManuallyMock).toHaveBeenCalledTimes(1);
    });
  });
});
