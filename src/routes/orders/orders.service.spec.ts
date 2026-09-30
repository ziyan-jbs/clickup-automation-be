import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { OrderStatus } from "@/entities/order.entity";
import { UserRole } from "@/entities/user.entity";
import { OrdersService } from "@/routes/orders/orders.service";
describe("OrdersService workflow guards", () => {
  const orders = { findOne: jest.fn(), findOneBy: jest.fn(), save: jest.fn() };
  const repository = { findOne: jest.fn(), findBy: jest.fn(), save: jest.fn() };
  const manager = { getRepository: jest.fn(() => repository), save: jest.fn(), create: jest.fn() };
  const db = { transaction: jest.fn((work) => work(manager)) };
  const service = new OrdersService(db as never, orders as never);
  const admin = {
    id: "usr_admin",
    email: "admin@test",
    name: "Admin",
    role: UserRole.ADMIN,
    isActive: true,
    requiresShopApproval: true,
  };
  const rep = { ...admin, id: "usr_rep", role: UserRole.SALES_REP };
  beforeEach(() => jest.clearAllMocks());
  it("does not allow non-reps to submit", async () => {
    await expect(
      service.submit(admin, {
        shopId: "shp_x",
        idempotencyKey: "x",
        lines: [{ productId: "prd_x", orderedBoxes: 1 }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("does not allow delivery above accepted stock", async () => {
    repository.findOne.mockResolvedValue({
      id: "ord_x",
      status: OrderStatus.PICKED_UP,
      repId: rep.id,
    });
    repository.findBy.mockResolvedValue([{ id: "lin_x", orderedBoxes: 6, acceptedBoxes: 4, unitPriceMinor: 100 }]);
    await expect(
      service.deliver("ord_x", rep, { lines: [{ lineId: "lin_x", deliveredBoxes: 5 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it("does not allow repeat completion", async () => {
    repository.findOne.mockResolvedValue({ id: "ord_x", status: OrderStatus.DELIVERED, repId: rep.id });
    await expect(
      service.deliver("ord_x", rep, { lines: [{ lineId: "lin_x", deliveredBoxes: 1 }] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
