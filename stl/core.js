export function fileError(file) {
  if (!/\.stl$/i.test(file.name)) return '请选择 .stl 文件。';
  if (!file.size) return '文件为空，请重新导出 STL。';
  if (file.size > 100 * 1024 * 1024) return '单个文件最大 100 MB，请先简化网格。';
  return null;
}
export function layoutOffsets(boxes, mode) {
  if (mode === 'overlay') return boxes.map(() => [0, 0, 0]);
  const widths = boxes.map(b => b.max[0] - b.min[0]);
  const gap = Math.max(...widths, 1) * 0.8;
  let cursor = -(widths.reduce((a,b) => a+b,0) + gap * (boxes.length-1)) / 2;
  return boxes.map((b,i) => {
    const offset = [cursor-b.min[0], -(b.min[1]+b.max[1])/2, -(b.min[2]+b.max[2])/2];
    cursor += widths[i] + gap;
    return offset.map(v => v || 0);
  });
}
