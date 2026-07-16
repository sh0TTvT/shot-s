# Celestial Atlas 数据声明

`celestialAtlas.json` 是由 `scripts/build-celestial-atlas.mjs` 生成的机械产物。项目保留这份声明，是为了让压缩后不再携带来源字段的每条星体与星座数据仍可追溯。

## 数据来源

- 上游项目：[d3-celestial](https://github.com/ofrohn/d3-celestial)
- 星体数据：`data/stars.6.json`，上游标注来自 XHIP（An Extended Hipparcos Compilation，Anderson E. & Francis C., 2012，VizieR V/137D）。
- 星座数据：`data/constellations.lines.json` 与 `data/constellations.json`，上游标注来自 IAU Constellation 资料，并包含上游作者调整的名称位置和部分连线。
- 坐标纪元：J2000。上游将赤经从 `0–24h` 换算为 GeoJSON 要求的 `-180–180°` 经度。

构建脚本固定读取 d3-celestial 提交 `7e720a3de062059d4c5400a379146a601d9010e0`，避免重新生成时星体位置和连线随上游变化。

## BSD 3-Clause License

Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
