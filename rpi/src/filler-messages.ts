import { PathLike } from 'fs';
import { readFile } from 'fs/promises';
import uniqueRandomArray from 'unique-random-array';
import * as yup from 'yup';

export class FillerMessages {
	public static schema(): yup.ArraySchema<string[], yup.AnyObject> {
		return yup.array(yup.string().required()).required();
	}

	public static loadFromFile(filePath: PathLike): Promise<FillerMessages> {
		return readFile(filePath, 'utf8')
			.then((json: string): unknown => JSON.parse(json))
			.then((value: unknown): Promise<string[]> => FillerMessages.schema().validate(value))
			.then((messages: string[]): FillerMessages => new FillerMessages(messages));
	}

	public constructor(public readonly messages: string[]) {
		this.chooseRandomMessage = uniqueRandomArray(this.messages);
	}

	public readonly chooseRandomMessage: () => string;
}
