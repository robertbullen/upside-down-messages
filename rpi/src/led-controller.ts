/// <reference path="./rpi-ws281x-native.d.ts" />

import ws281x from 'rpi-ws281x-native';
import { Color } from './color.js';

export class LedController {
	public constructor(
		public readonly ledCount: number,
		public readonly ledMask: boolean[] = new Array(ledCount).fill(true),
	) {
		this.channel = ws281x(ledCount, {
			freq: 800000,
			stripType: ws281x.stripType.WS2811_RGB,
		});
		ws281x.reset();
		ws281x.render();
	}

	public dispose(): void {
		ws281x.reset();
		ws281x.render();
		ws281x.finalize();
	}

	public render(colors: Color[]): void {
		colors.forEach((color: Color, colorIndex: number): void => {
			if (this.ledMask[colorIndex]) {
				this.channel.array[colorIndex] = color.toInteger();
			}
		});
		ws281x.render();
	}

	public reset(): void {
		ws281x.reset();
		ws281x.render();
	}

	private readonly channel: any;
}
