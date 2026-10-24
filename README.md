# Tự học AI

Website tự học AI bằng tiếng Việt: từ công cụ làm việc (Git và GitHub) đến Machine Learning, Deep Learning, Computer Vision, NLP, mô hình ngôn ngữ lớn (LLM), Agentic AI và MLOps. Mỗi bài có công thức, code chạy được, minh họa tương tác trong trình duyệt và bài tập có lời giải ẩn.

| Tab | File | Nội dung chính |
| --- | --- | --- |
| Trang chủ | `index.html` | Lộ trình học, cách học, lưu ý về độ tin cậy |
| GitHub | `github.html` | Git cơ bản, mô hình đối tượng và mã băm, merge ba chiều, rebase/reset/bisect, chiến lược nhánh, Actions, Pages, Git cho dự án AI |
| Machine Learning | `machine-learning.html` | Suy dẫn OLS/logistic, bias–variance, PCA, SVM, cây, boosting, đánh giá và so sánh mô hình |
| Deep Learning | `deep-learning.html` | Backprop ma trận, bộ tối ưu, khởi tạo, BatchNorm, LSTM/BPTT, PyTorch, sân chơi mạng nơ-ron |
| Computer Vision | `computer-vision.html` | Đạo hàm tích chập, chi phí, ResNet, ViT/CLIP, phát hiện (IoU, NMS, AP), U-Net, Grad-CAM |
| NLP | `nlp.html` | TF-IDF, Naive Bayes, n-gram/Kneser–Ney, BPE, skip-gram/PMI, BERT, BLEU, đặc thù tiếng Việt |
| LLM | `llm.html` | Attention từng bước, RoPE, GQA, FlashAttention, KV cache, scaling, DPO, giải mã, RAG, LoRA, đánh giá |
| Agentic AI | `agentic-ai.html` | Vòng lặp, tool use, MCP, chi phí ngữ cảnh, workflow, đa agent, kiểm chứng/thử lại, đánh giá, an toàn |
| MLOps | `mlops.html` | Tái lập, MLflow/DVC, kiểm thử, FastAPI/Docker, hàng đợi, A/B test, canary, PSI/drift, huấn luyện lại, LLMOps |
| Kết hợp AI | `ket-hop-cong-cu-ai.html` | Kết hợp Claude, Gemini, Antigravity, Cursor, Copilot, Codex, Perplexity, Consensus: vai trò, AGENTS.md, MCP, review chéo, chi phí và bảo mật |
| Cách dùng | `huong-dan.html` | Hướng dẫn dùng website: chạy, phím tắt, minh họa, thêm nội dung, xuất bản |

## Chạy trên máy

Website là HTML/CSS/JavaScript thuần, không cần bước build. Cách khuyên dùng:

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

Mở thẳng `index.html` bằng trình duyệt cũng chạy được (đã thử với Chromium); nút “Sao chép” code có thể không hoạt động ở cách này. Hướng dẫn đầy đủ: trang **Cách dùng** (`huong-dan.html`).

## Cấu trúc

```
index.html, *.html          các trang nội dung
assets/css/style.css        giao diện (sáng/tối)
assets/js/site.js           header, tìm kiếm, mục lục, tô màu code, render công thức, khung minh họa
assets/js/viz-*.js          minh họa tương tác theo từng chủ đề (git, ml, dl, cv, nlp, llm, agent, mlops, combo)
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
