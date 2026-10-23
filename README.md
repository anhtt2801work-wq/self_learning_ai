# Tự học AI

Website tự học AI bằng tiếng Việt: từ công cụ làm việc (Git và GitHub) đến Machine Learning, Deep Learning, NLP, mô hình ngôn ngữ lớn (LLM) và Agentic AI. Mỗi bài có công thức, code chạy được, minh họa tương tác trong trình duyệt và bài tập có lời giải ẩn.

| Tab | File | Nội dung chính |
| --- | --- | --- |
| Trang chủ | `index.html` | Lộ trình học, cách học, lưu ý về độ tin cậy |
| GitHub | `github.html` | Git cơ bản, nhánh/merge, PR, Actions, Pages, Git cho dự án AI |
| Machine Learning | `machine-learning.html` | Hồi quy, gradient descent, overfitting, đánh giá, k-NN, cây, k-means |
| Deep Learning | `deep-learning.html` | Backprop, Adam, điều chuẩn, CNN/RNN, PyTorch, sân chơi mạng nơ-ron |
| NLP | `nlp.html` | TF-IDF, n-gram, BPE, embedding, BERT, đặc thù tiếng Việt |
| LLM | `llm.html` | Transformer, attention, scaling, SFT/RLHF/DPO, giải mã, RAG, LoRA |
| Agentic AI | `agentic-ai.html` | Vòng lặp ReAct, tool use, MCP, workflow, độ tin cậy, an toàn |

## Chạy trên máy

Website là HTML/CSS/JavaScript thuần, không cần bước build.

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

Không mở bằng `file://`, một số trình duyệt chặn tải script theo cách đó.

## Cấu trúc

```
index.html, *.html          các trang nội dung
assets/css/style.css        giao diện (sáng/tối)
assets/js/site.js           header, tìm kiếm, mục lục, tô màu code, render công thức, khung minh họa
assets/js/viz-*.js          minh họa tương tác theo từng chủ đề
assets/js/search-index.js   chỉ mục tìm kiếm (được sinh tự động, đừng sửa tay)
assets/vendor/katex/        KaTeX (MIT) để hiển thị công thức, đã đóng gói sẵn
tools/                      script kiểm tra và sinh chỉ mục
.github/workflows/          CI và triển khai GitHub Pages
```

## Thêm hoặc sửa bài học

1. Sửa file `.html` tương ứng. Mỗi mục `h2`/`h3` cần có `id` duy nhất (dùng cho mục lục và tìm kiếm).
2. Công thức: `\( ... \)` cho inline, `$$ ... $$` cho display (KaTeX). Trong HTML, viết `\lt` thay cho dấu `<` trong công thức và không đặt chữ có dấu tiếng Việt trong `\text{}`.
3. Code: `<pre><code class="language-python">...</code></pre>`, ngôn ngữ hỗ trợ tô màu: `python`, `js`, `json`, `bash`, `yaml`. Escape `<` và `>` thành `&lt;` và `&gt;`.
4. Minh họa: thêm `<div class="viz" data-viz="ten" data-title="Tiêu đề"></div>` rồi đăng ký `Viz.register('ten', function (root) { ... })` trong một file `assets/js/viz-*.js` và nạp file đó ở cuối trang.
5. Cập nhật chỉ mục và kiểm tra:

```bash
python3 tools/build_search_index.py
python3 tools/check_site.py
```

## Xuất bản bằng GitHub Pages

Repo có sẵn workflow `.github/workflows/pages.yml`. Sau khi merge vào `main`, vào **Settings → Pages** và chọn **Source: GitHub Actions** (tên menu có thể thay đổi theo thời gian, xem tài liệu của GitHub). Địa chỉ có dạng `https://<user>.github.io/<repo>/`.

## Về độ tin cậy của nội dung

Nội dung được soạn với sự hỗ trợ của AI. Công thức, số liệu và liên kết cần được đối chiếu với nguồn gốc ở cuối mỗi bài; phần LLM và Agentic AI thay đổi nhanh và có thể đã lỗi thời. Nếu bạn thấy sai sót, hãy mở issue hoặc pull request.

KaTeX © các tác giả KaTeX, giấy phép MIT (xem `assets/vendor/katex/LICENSE`).
