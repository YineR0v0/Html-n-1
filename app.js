// app.js
(function() {
    'use strict';

    // ---------- DOM 元素 ----------
    const htmlInput = document.getElementById('htmlInput');
    const cssInput = document.getElementById('cssInput');
    const jsInput = document.getElementById('jsInput');
    const mergedPreview = document.getElementById('mergedPreview');

    const clearHtmlBtn = document.getElementById('clearHtmlBtn');
    const clearCssBtn = document.getElementById('clearCssBtn');
    const clearJsBtn = document.getElementById('clearJsBtn');

    const refreshBtn = document.getElementById('refreshBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');

    // ---------- 辅助函数 ----------
    let statusTimeout = null;

    function showStatus(text, isSuccess = true) {
        if (!statusMessage || !statusText) return;
        statusText.textContent = text;
        statusMessage.style.background = isSuccess ? '#dcfce7' : '#fee2e2';
        statusMessage.style.color = isSuccess ? '#166534' : '#b91c1c';
        statusMessage.classList.add('show');

        if (statusTimeout) clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 2500);
    }

    // 核心：根据三个文本框内容生成完整 HTML 字符串
    function buildFullHtml() {
        const rawHtml = htmlInput.value.trim();
        const rawCss = cssInput.value.trim();
        const rawJs = jsInput.value.trim();

        // 防止用户 JS 中出现 </script> 导致提前闭合
        const safeJs = rawJs.replace(/<\/script>/gi, '<\\/script>');

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>合并预览</title>
    <style>
${rawCss || '/* 无自定义 CSS */'}
    </style>
</head>
<body>
${rawHtml || '<!-- 无 HTML 内容 -->'}
    <script>
${safeJs || '// 无 JavaScript 代码'}
    <\/script>
</body>
</html>`;
    }

    // 更新预览文本框
    function updatePreview() {
        try {
            const fullHtml = buildFullHtml();
            mergedPreview.value = fullHtml;
            return fullHtml;
        } catch (e) {
            console.error('生成合并代码出错:', e);
            mergedPreview.value = '/* 生成合并代码时出错，请检查控制台 */';
            showStatus('合并出错，请检查输入', false);
            return '';
        }
    }

    // 主动刷新预览并显示成功状态
    function refreshPreviewWithStatus() {
        const fullHtml = updatePreview();
        if (fullHtml) {
            showStatus('预览已更新');
        }
        return fullHtml;
    }

    // 下载文件
    function downloadHtml() {
        const fullHtml = updatePreview();
        if (!fullHtml) return;

        // 移动端兼容的下载方式
        try {
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'merged-page.html';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            // 延迟清理，兼容部分移动浏览器
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

            showStatus('下载已开始');
        } catch (err) {
            console.error('下载失败:', err);
            // 降级方案：打开新窗口
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(fullHtml);
                newWindow.document.close();
                showStatus('已在新窗口打开，请手动保存', true);
            } else {
                showStatus('下载失败，请检查浏览器设置', false);
            }
        }
    }

    // 复制到剪贴板（兼容移动端）
    async function copyToClipboard() {
        const fullHtml = updatePreview();
        if (!fullHtml) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fullHtml);
                showStatus('代码已复制到剪贴板');
            } else {
                throw new Error('Clipboard API 不可用');
            }
        } catch (err) {
            console.warn('Clipboard API 失败，尝试降级方案:', err);
            try {
                // 降级方案 1：选中文本 + execCommand
                mergedPreview.select();
                mergedPreview.setSelectionRange(0, fullHtml.length);
                const success = document.execCommand('copy');

                if (success) {
                    showStatus('复制成功');
                } else {
                    throw new Error('execCommand 复制失败');
                }

                // 取消选中
                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                }
            } catch (fallbackErr) {
                console.error('复制失败:', fallbackErr);
                showStatus('复制失败，请长按手动选择复制', false);
            }
        }
    }

    // ---------- 清空按钮 ----------
    function clearHtml() {
        htmlInput.value = '';
        refreshPreviewWithStatus();
        htmlInput.focus();
    }

    function clearCss() {
        cssInput.value = '';
        refreshPreviewWithStatus();
        cssInput.focus();
    }

    function clearJs() {
        jsInput.value = '';
        refreshPreviewWithStatus();
        jsInput.focus();
    }

    // ---------- 事件绑定 ----------
    if (clearHtmlBtn) clearHtmlBtn.addEventListener('click', clearHtml);
    if (clearCssBtn) clearCssBtn.addEventListener('click', clearCss);
    if (clearJsBtn) clearJsBtn.addEventListener('click', clearJs);

    if (refreshBtn) refreshBtn.addEventListener('click', refreshPreviewWithStatus);
    if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadHtml);

    // 实时监听输入变化 (debounce)
    let debounceTimer = null;

    function autoUpdatePreview() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updatePreview();
        }, 300);
    }

    if (htmlInput) htmlInput.addEventListener('input', autoUpdatePreview);
    if (cssInput) cssInput.addEventListener('input', autoUpdatePreview);
    if (jsInput) jsInput.addEventListener('input', autoUpdatePreview);

    // 移动端：触摸结束也触发一次更新，确保输入法收起后预览更新
    if (htmlInput) htmlInput.addEventListener('blur', updatePreview);
    if (cssInput) cssInput.addEventListener('blur', updatePreview);
    if (jsInput) jsInput.addEventListener('blur', updatePreview);

    // ---------- 初始化示例 ----------
    function setInitialExample() {
        if (!htmlInput || !cssInput || !jsInput) return;

        htmlInput.value = `<div class="card">
    <h2>代码合并工坊</h2>
    <p>这个页面的 <strong>HTML、CSS、JS</strong> 被合并成了一个文件。</p>
    <button id="demoBtn">点我试试</button>
    <p id="demoMsg" style="margin-top: 8px; font-size: 0.9rem; color: #475569;"></p>
</div>`;

        cssInput.value = `.card {
    max-width: 420px;
    margin: 0 auto;
    background: white;
    border-radius: 24px;
    padding: 2rem 1.8rem;
    box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.1);
    font-family: system-ui, 'Segoe UI', sans-serif;
    border: 1px solid #e9eef3;
    text-align: center;
}
h2 {
    color: #0f172a;
    margin-top: 0;
    font-weight: 600;
}
button {
    background: #2563eb;
    border: none;
    color: white;
    padding: 0.7rem 1.8rem;
    border-radius: 40px;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: 0.15s;
    box-shadow: 0 6px 14px -6px #2563eb;
}
button:hover {
    background: #1d4ed8;
    transform: scale(0.98);
}`;

        jsInput.value = `const btn = document.getElementById('demoBtn');
const msg = document.getElementById('demoMsg');
if (btn) {
    btn.addEventListener('click', function() {
        msg.textContent = '按钮点击成功！JavaScript 正在工作。';
        msg.style.color = '#0f172a';
    });
} else {
    console.warn('按钮未找到');
}`;

        updatePreview();
        showStatus('示例已加载，可自由修改', true);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setInitialExample);
    } else {
        setInitialExample();
    }

    // 移动端：防止页面在输入时被键盘挤压变形
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            // 键盘弹出/收起时重新计算，无需额外操作，仅防止布局异常
        });
    }
})();
