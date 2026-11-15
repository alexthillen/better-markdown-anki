import { useEffect, useState } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { buildChatText } from '../copyForChat';

export default function CopyForChat({ front, back, extra, getFields }) {
    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!status) return undefined;
        const timer = setTimeout(() => setStatus(''), status === 'Copied' ? 2500 : 6000);
        return () => clearTimeout(timer);
    }, [status]);

    async function copy() {
        setBusy(true);
        setStatus('');
        try {
            const { text, missing } = await buildChatText(getFields ? getFields() : { front, back, extra });
            // The legacy clipboard command works in Anki's webview, where
            // navigator.clipboard may exist but never settle.
            let copied = false;
            const input = document.createElement('textarea');
            input.value = text;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            try { copied = document.execCommand('copy'); } catch { /* try modern API */ }
            input.remove();
            if (!copied && navigator.clipboard?.writeText) {
                await Promise.race([
                    navigator.clipboard.writeText(text),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard timed out')), 2000)),
                ]);
                copied = true;
            }
            if (!copied) throw new Error('Clipboard access is unavailable');
            setStatus(missing.length ? `Copied; could not load: ${missing.join(', ')}` : 'Copied');
        } catch (error) {
            setStatus(`Could not copy: ${error.message}`);
        } finally {
            setBusy(false);
        }
    }

    return <Group gap="sm">
        <Button variant="subtle" color="gray" size="compact-xs" onClick={copy} loading={busy}
            style={{ boxShadow: 'none', border: 0, fontWeight: 500 }}>
            Copy for LLM chat
        </Button>
        <Text size="xs" role="status">{status}</Text>
    </Group>;
}
