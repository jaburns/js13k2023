/*
TTT Tiny Texture Tumbler
Dominic Szablewski - https://phoboslab.org

-- LICENSE: The MIT License(MIT)
Copyright(c) 2019 Dominic Szablewski
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files(the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and / or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions :
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

T=(td, only_this_index=-1,stack_depth=0) => {
	return td.filter((d,i) => only_this_index < 0 || i == only_this_index).map(d => {
		let i = 0,
			e = document.createElement('canvas'),
			c = e.getContext('2d'),
			rgba_from_2byte = c =>
				("#"+(c|65536).toString(16).slice(-4)),
			fill_rect = (x, y, w, h, ...colors) =>
				colors.map((color, j) => {
					c.fillStyle = rgba_from_2byte(color);
					c.fillRect(x+[-1,1,0][j], y+[-1,1,0][j], w, h);
				})
			;
		// Set up canvas width and height
		const W = e.width = 32;
		const H = e.height = 32;

		// Fill with background color
		fill_rect(0, 0, W, H, 0,0, d[i++]);

		// Perform all the steps for this texture
		while (i < d.length) {
			let f = [
				// 0 - rectangle: x, y, width, height, top, bottom, fill
				(x, y, width, height, top, bottom, fill) => {
					fill_rect(x, y, width, height, top, bottom, fill)
				},

				// 1 - rectangle_multiple: start_x, start_y, width, height,
				//                         inc_x, inc_y, top, bottom, fill
				(sx, sy, w, h, inc_x, inc_y, top, bottom, fill) => {
					for (let x = sx; x < W; x += inc_x) {
						for (let y = sy; y < H; y += inc_y) {
							fill_rect(x, y, w, h, top, bottom, fill);
						}
					}
				},

				// 2 - random noise: color, size, power
				(color, size, power) => {
					for (let x = 0; x < W; x += size) {
						for (let y = 0; y < H; y += size) {
							// Take the color value (first 3 nibbles) and
							// randomize the alpha value (last nibble)
							// between 0 and the input alpha.
							fill_rect(x, y, size, size, 0, 0, (color&0xfff0) + Math.pow(Math.random(),power)*(color&15));
						}
					}
				},

				// 3 - text: x, y, color, font,size, text
				(x, y, color, font, size, text) => {
					c.fillStyle = rgba_from_2byte(color);
					c.font = size + 'px ' + ['sans-',''][font]+'serif';
					c.fillText(text, x, y);
				},

				// 4 - draw a previous texture
				// We limit the stack depth here to not end up in an infinite loop
				// by accident
				(texture_index, x, y, w, h, alpha) => {
					c.globalAlpha = alpha/15;
					(
						texture_index < td.length && stack_depth < 16 &&
						c.drawImage(T(td, texture_index, stack_depth+1)[0], x, y, w, h)
					);
					c.globalAlpha = 1;
				},

				// 5 - voronoi
				(color, count) => {
					let pts = []
					for (let i = 0; i < count; ++i) {
						for (let j = 0,a=Math.random(),b=Math.random(); j < 9; ++j) {
							pts.push([
								W*(a + (j%3)-1),
								H*(b + (j/3|0)-1),
							])
						}
					}
					for (let x = 0; x < W; x += 1) {
						for (let y = 0; y < H; y += 1) {
							let [[d0],[d1]] = pts
								.map(([a,b])=>[Math.hypot(x-a,y-b),a,b])
								.sort(([a],[b])=>a-b)
							let amount = Math.max(0,1-.5*Math.abs(d0-d1));

							// Take the color value (first 3 nibbles) and
							// randomize the alpha value (last nibble)
							// between 0 and the input alpha.
							fill_rect(x, y, 1, 1, 0, 0, (color&0xfff0) + amount*(color&15));
						}
					}
				},

			][d[i++]];
			f(...d.slice(i, i+=f.length));
		}
		return e;
	});
};
