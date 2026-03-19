const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).json({ error: '메시지를 입력해주세요.' });
    }

    // 큰따옴표 이스케이프 처리
    const escapedMessage = userMessage.replace(/"/g, '"');
    const command = `gemini -y -p "${escapedMessage}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            // gemini CLI에서 에러가 발생했을 때 stderr를 반환하도록 수정
            const errorMessage = stderr || error.message;
            return res.status(500).json({ error: `명령어 실행 오류: ${errorMessage}` });
        }
        res.json({ response: stdout });
    });
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
