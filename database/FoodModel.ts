import { Model } from '@nozbe/watermelondb';
import { field, writer, readonly } from '@nozbe/watermelondb/decorators';

export default class FoodModel extends Model {
  static table = 'foods';

  @field('name') name!: string;
  @field('brand') brand?: string;
  @field('calories') calories!: number;
  @field('protein') protein!: number;
  @field('carbs') carbs!: number;
  @field('fat') fat!: number;
  @field('serving_size') serving_size?: string;
  @field('barcode') barcode?: string;
}
