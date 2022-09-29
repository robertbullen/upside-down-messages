import { PathLike } from 'fs';
import { readFile } from 'fs/promises';
import * as yup from 'yup';

export interface CharToLedIndexHash extends Record<string, number> {}

export abstract class CharToLedIndexHash {
	public static schema(ledCount: number): yup.ObjectSchema<CharToLedIndexHash> {
		const entrySchema = yup
			.tuple([
				yup.string().length(1).required(),
				yup.number().integer().min(0).lessThan(ledCount).required(),
			])
			.required();
		return yup
			.object()
			.test((value: object): boolean =>
				Object.entries(value).every((entry): [string, number] =>
					entrySchema.validateSync(entry),
				),
			);
	}

	public static async loadFromFile(
		filePath: PathLike,
		ledCount: number,
	): Promise<CharToLedIndexHash> {
		return CharToLedIndexHash.schema(ledCount).validate(
			JSON.parse(await readFile(filePath, 'utf8')),
		);
	}
}
