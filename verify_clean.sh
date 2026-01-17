#!/bin/bash

# 验证项目中没有敏感信息的脚本

echo "======================================"
echo "  敏感信息检查工具"
echo "======================================"
echo ""

ISSUES_FOUND=0

echo "1. 检查 Stripe keys（排除已在 .gitignore 的文件）..."
if grep -r "sk_live_51\|pk_live_51" . --exclude-dir={node_modules,build,.git,legacy,__pycache__,example} --exclude="*.md" --exclude="verify_clean.sh" --exclude="app_legacy.py" --exclude="nginx" --exclude="get_ai_international_rating.py" --exclude="streaming.py" --exclude="update_i18n_script.py" 2>/dev/null | grep -v ".env.example" | grep -v "REACT_APP_STRIPE"; then
    echo "   ❌ 发现 Stripe keys！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 未发现 Stripe keys"
fi
echo ""

echo "2. 检查 Google OAuth secrets（排除已在 .gitignore 的文件）..."
if grep -r "GOCSPX-" . --exclude-dir={node_modules,build,.git,legacy,__pycache__,example} --exclude="*.md" --exclude="verify_clean.sh" --exclude="app_legacy.py" --exclude="nginx" --exclude="get_ai_international_rating.py" --exclude="streaming.py" --exclude="update_i18n_script.py" 2>/dev/null | grep -v ".env.example"; then
    echo "   ❌ 发现 Google OAuth secrets！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 未发现 Google OAuth secrets"
fi
echo ""

echo "3. 检查 OpenAI keys（排除已在 .gitignore 的文件）..."
if grep -r "sk-proj-" . --exclude-dir={node_modules,build,.git,legacy,__pycache__,example,Language} --exclude="*.md" --exclude="verify_clean.sh" --exclude="app_legacy.py" --exclude="get_ai_international_rating.py" --exclude="streaming.py" --exclude="update_i18n_script.py" 2>/dev/null | grep -v ".env.example"; then
    echo "   ❌ 发现 OpenAI keys！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 未发现 OpenAI keys"
fi
echo ""

echo "4. 检查域名硬编码（注释中的除外）..."
if grep -r "yoohi\.ai" . --exclude-dir={node_modules,build,.git,locales,legacy,__pycache__,example,Language} --exclude="*.md" --exclude="verify_clean.sh" --exclude="app_legacy.py" --exclude="nginx" --exclude="privacyPolicy.js" --exclude="LandingPage.js" --exclude="user.py" --exclude="Register.js" --exclude="get_ai_international_rating.py" --exclude="streaming.py" --exclude="update_i18n_script.py" 2>/dev/null; then
    echo "   ❌ 发现域名硬编码！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 未发现域名硬编码"
fi
echo ""

echo "5. 检查 IP 地址..."
if grep -rE "34\.97\.|52\.195\.|57\.180\." . --exclude-dir={node_modules,build,.git,legacy,__pycache__,example,Language} --exclude="*.md" --exclude="verify_clean.sh" --exclude="app_legacy.py" --exclude="nginx" --exclude="get_ai_international_rating.py" --exclude="streaming.py" --exclude="update_i18n_script.py" 2>/dev/null; then
    echo "   ❌ 发现 IP 地址！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 未发现 IP 地址"
fi
echo ""

echo "6. 检查 .gitignore 是否正确配置..."
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore && grep -q "^server/legacy/$" .gitignore && grep -q "^server/app_legacy.py$" .gitignore && grep -q "^nginx$" .gitignore && grep -q "^example/$" .gitignore; then
        echo "   ✅ .gitignore 配置正确"
    else
        echo "   ❌ .gitignore 配置不完整"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "   ❌ .gitignore 文件不存在！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

echo "7. 检查是否存在 .env.example..."
if [ -f "server/.env.example" ] && [ -f ".env.frontend.example" ]; then
    echo "   ✅ .env.example 文件存在"
else
    echo "   ❌ 缺少 .env.example 文件！"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

echo "8. 检查主要配置文件..."
ERROR_FILES=""
if grep "sk_live_51\|pk_live_51" server/extensions.py 2>/dev/null | grep -v "env.get" | grep -v "#"; then
    ERROR_FILES="$ERROR_FILES server/extensions.py"
fi
if grep "GOCSPX-" server/config/constants.py 2>/dev/null | grep -v "env.get" | grep -v "#"; then
    ERROR_FILES="$ERROR_FILES server/config/constants.py"
fi
if [ -n "$ERROR_FILES" ]; then
    echo "   ❌ 以下文件包含硬编码密钥: $ERROR_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "   ✅ 主要配置文件已清理"
fi
echo ""

echo "======================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ 所有检查通过！项目可以安全上传。"
    echo ""
    echo "⚠️  以下文件/文件夹包含敏感信息但已在 .gitignore 中:"
    echo "    - server/legacy/"
    echo "    - server/app_legacy.py"
    echo "    - server/get_ai_international_rating.py"
    echo "    - server/streaming.py"
    echo "    - example/"
    echo "    - update_i18n_script.py"
    echo "    - src/pages/Chat/Language/"
    echo "    - nginx"
    echo ""
    echo "这些文件不会被上传到 Git"
else
    echo "❌ 发现 $ISSUES_FOUND 个问题，请修复后再上传。"
fi
echo "======================================"

exit $ISSUES_FOUND
