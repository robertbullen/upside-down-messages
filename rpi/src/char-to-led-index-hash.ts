import * as fs from 'fs/promises';
import * as yup from 'yup';

export interface CharToLedIndexHash extends Record<string, number> {}

export abstract class CharToLedIndexHash {
	public static schema(
		ledCount: number,
	): yup.ObjectSchema<CharToLedIndexHash> {
		const entrySchema = yup.tuple([
			yup.string().length(1).required(),
			yup.number().integer().min(0).lessThan(ledCount).required(),
		]);
		return yup
			.object()
			.test((value: object): boolean =>
				Object.entries(value).every((entry) =>
					entrySchema.validateSync(entry),
				),
			);
	}

	public static async loadFromFile(
		filePath: string,
		ledCount: number,
	): Promise<CharToLedIndexHash> {
		return CharToLedIndexHash.schema(ledCount).validate(
			JSON.parse(await fs.readFile(filePath, 'utf8')),
		);
	}
}
