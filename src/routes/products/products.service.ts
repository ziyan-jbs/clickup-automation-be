import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, ILike, Repository } from "typeorm";
import { Product } from "@/entities/product.entity";
import { ProductQuery } from "@/routes/products/products.dto";
@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly products: Repository<Product>, private readonly dataSource: DataSource) {}
  async list(query: ProductQuery, activeOnly = false) {
    const { search, page = 1, limit = 25 } = query;
    const active = activeOnly ? true : query.active;
    const where = active === undefined ? {} : { isActive: active };
    const [items, total] = search
      ? await this.products.findAndCount({
          where: [
            { ...where, name: ILike(`%${search}%`) },
            { ...where, sku: ILike(`%${search}%`) },
          ],
          order: { name: "ASC" },
          skip: (page - 1) * limit,
          take: limit,
        })
      : await this.products.findAndCount({
          where,
          order: { name: "ASC" },
          skip: (page - 1) * limit,
          take: limit,
        });
    return { items, total, page, limit };
  }
  async get(id: string, activeOnly = false) {
    const product = await this.products.findOneBy({
      id,
      ...(activeOnly ? { isActive: true } : {}),
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }
  async create(input: Partial<Product>) {
    try {
      const saved = await this.products.save(this.products.create(input));
      return this.get(saved.id);
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === "23505")
        throw new ConflictException("Product SKU is already in use");
      throw error;
    }
  }
  async update(id: string, input: Partial<Product>) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const product = await manager.getRepository(Product).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!product) throw new NotFoundException("Product not found");
        Object.assign(product, input);
        await manager.save(product);
      });
      return this.get(id);
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === "23505")
        throw new ConflictException("Product SKU is already in use");
      throw error;
    }
  }
}
