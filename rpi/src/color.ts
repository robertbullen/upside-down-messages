import uniqueRandomArray from 'unique-random-array';

export abstract class Color {
	public abstract toInteger(): number;
}

export class RgbColor extends Color {
	public static black(): RgbColor {
		return new RgbColor(0, 0, 0);
	}

	public static toInteger(red: number, green: number, blue: number): number {
		return (
			((Math.round(red) & 0xff) << 16) |
			((Math.round(green) & 0xff) << 8) |
			(Math.round(blue) & 0xff)
		);
	}

	public constructor(
		public red: number = 0,
		public green: number = 0,
		public blue: number = 0,
	) {
		super();
	}

	public override toInteger(): number {
		return RgbColor.toInteger(this.red, this.green, this.blue);
	}
}

export class HsbColor extends Color {
	public static black(): HsbColor {
		return new HsbColor(0, 0, 0);
	}

	public static white(): HsbColor {
		return new HsbColor(0, 0, 100);
	}

	public static red(): HsbColor {
		return new HsbColor(0, 100, 100);
	}

	public static orange(): HsbColor {
		return new HsbColor(30, 100, 100);
	}

	public static yellow(): HsbColor {
		return new HsbColor(60, 100, 100);
	}

	public static green(): HsbColor {
		return new HsbColor(120, 100, 100);
	}

	public static cyan(): HsbColor {
		return new HsbColor(180, 0, 0);
	}

	public static blue(): HsbColor {
		return new HsbColor(240, 100, 100);
	}

	public static violet(): HsbColor {
		return new HsbColor(270, 100, 100);
	}

	public static magenta(): HsbColor {
		return new HsbColor(300, 100, 100);
	}

	public static randomNamedColor(): HsbColor {
		return HsbColor._randomNamedColorFactory()();
	}

	public constructor(
		public hue: number = 0,
		public saturation: number = 0,
		public brightness: number = 0,
	) {
		super();
	}

	public override toInteger(): number {
		const s: number = Math.min(this.saturation, 100) / 100;
		const b: number = Math.min(this.brightness, 100) / 100;

		const k = (n: number): number => (n + this.hue / 60) % 6;
		const f = (n: number): number =>
			b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));

		return RgbColor.toInteger(255 * f(5), 255 * f(3), 255 * f(1));
	}

	private static readonly _randomNamedColorFactory = uniqueRandomArray([
		HsbColor.red,
		HsbColor.orange,
		HsbColor.yellow,
		HsbColor.green,
		HsbColor.blue,
		HsbColor.violet,
		HsbColor.magenta,
	]);
}
