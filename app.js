// ----------------------------------------------------
// 【設定】ここにAPIキーとGAS URLを直接埋め込みます
// ----------------------------------------------------
const GEMINI_API_KEY = AIzaSyDj2IKzPs_QZEtpsyUP_nIEYsVrdbwwvVk;
const GAS_WEB_APP_URL = https://script.google.com/macros/s/AKfycbzdWyvCiHFXxOIAhgyJOLu2lKKOhncUnQYAW2_7SMzLxgLiDwnAVX6Fa6goWWlIcy7QNg/exec;

let base64Image = "";

document.addEventListener("DOMContentLoaded", function() {
  const fileInput = document.getElementById("fileInput");
  const imagePreview = document.getElementById("imagePreview");
  const previewText = document.getElementById("previewText");
  const analyzeBtn = document.getElementById("analyzeBtn");

  if (fileInput) {
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        base64Image = event.target.result.split(",")[1];

        if (imagePreview && previewText) {
          imagePreview.src = event.target.result;
          imagePreview.style.display = "block";
          previewText.style.display = "none";
        }

        if (analyzeBtn) {
          analyzeBtn.disabled = false;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", function() {
      if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("ここに")) {
        alert("APIキーが設定されていません。");
        return;
      }

      const loading = document.getElementById("loading");
      const statusText = document.getElementById("loadingStatus");
      if (loading) loading.style.display = "block";
      if (analyzeBtn) analyzeBtn.style.display = "none";
      if (statusText) statusText.textContent = "AIで判定中...";

      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
      
      const promptText = 'この画像に写っている植物（雑草）の名前（日本語の一般的な名称、例: コナギ、オモダカ、タイヌビエ、アゼナ等）を1つ確定して、JSON形式のみで返してください。フォーマット: {"name": "植物名"}';

      const requestBody = {
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      };

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      })
      .then(function(res) {
        if (!res.ok) throw new Error("API通信に失敗しました。");
        return res.json();
      })
      .then(function(json) {
        const textResult = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResult);
        const weedName = parsed.name;

        document.getElementById("resName").textContent = weedName;

        if (GAS_WEB_APP_URL && !GAS_WEB_APP_URL.includes("ここに")) {
          if (statusText) statusText.textContent = "スプレッドシートから検索中...";
          return fetch(GAS_WEB_APP_URL)
            .then(function(response) { return response.json(); })
            .then(function(list) {
              const found = list.find(function(item) {
                return item["名前"] && (item["名前"].trim().includes(weedName) || weedName.includes(item["名前"].trim()));
              });
              displayResult(weedName, found);
            });
        } else {
          displayResult(weedName, null);
        }
      })
      .catch(function(err) {
        alert("エラー: " + err.message);
      })
      .finally(function() {
        if (loading) loading.style.display = "none";
        if (analyzeBtn) analyzeBtn.style.display = "block";
      });
    });
  }
});

function displayResult(weedName, sheetData) {
  document.getElementById("resName").textContent = weedName;
  const badge = document.getElementById("resSource");

  if (sheetData) {
    badge.textContent = "図鑑一致";
    badge.style.background = "#e3f2fd";
    badge.style.color = "#1565c0";

    document.getElementById("resFamily").textContent = sheetData["科名"] || "-";

    const html = 
      '<div class="detail-card"><strong>区分 / 発生場所:</strong> ' + (sheetData["在来 / 外来"] || "-") + ' / ' + (sheetData["分布・主な発生場所"] || "-") + '</div>' +
      '<div class="detail-card"><strong>生態・特徴:</strong> ' + (sheetData["主な生態・特徴"] || "-") + '</div>' +
      '<div class="detail-card"><strong>対処月:</strong> ' + (sheetData["対処月（最も効果的）"] || "-") + '</div>' +
      '<div class="detail-card"><strong>発生レベル:</strong> ' + (sheetData["発生レベル（難易度）"] || "-") + '</div>' +
      '<div class="detail-card" style="background:#edf7ed;"><strong>💡 対処法:</strong> ' + (sheetData["効率的な対処法（ピンポイント対策）"] || "-") + '</div>';
    
    document.getElementById("resFeatures").innerHTML = html;
  } else {
    badge.textContent = "AI推測のみ";
    badge.style.background = "#fff3e0";
    badge.style.color = "#e65100";

    document.getElementById("resFamily").textContent = "データなし";
    document.getElementById("resFeatures").textContent = "スプレッドシート内にこの雑草の登録は見つかりませんでした。";
  }
}