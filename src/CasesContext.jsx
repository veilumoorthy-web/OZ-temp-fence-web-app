import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CasesContext = createContext(null)

export function CasesProvider({ children }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCases = async () => {
      try {
        // Use Vite environment variables
        const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
        const sheetId = import.meta.env.VITE_SPREADSHEET_ID;
        const casesRange = "'Customer Details'!A1:Z1000";
        const msgsRange = "'Messages'!A1:Z1000";
        
        if (!apiKey || !sheetId) {
          console.warn("⚠️ Missing Google Sheets API Key or ID. Cases will be empty.");
          setLoading(false);
          return;
        }

        const [casesRes, msgsRes] = await Promise.all([
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${casesRange}?key=${apiKey}`),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${msgsRange}?key=${apiKey}`)
        ]);

        if (!casesRes.ok || !msgsRes.ok) throw new Error("Failed to fetch from Google Sheets");

        const casesData = await casesRes.json();
        const msgsData = await msgsRes.json();

        // Process Messages
        const msgsRows = msgsData.values || [];
        const msgHeaders = msgsRows[0] || [];
        const allMessages = msgsRows.slice(1).map(row => {
          const obj = {};
          msgHeaders.forEach((h, i) => obj[h.trim()] = row[i]); // Trim headers to avoid 'Chat Id ' issues
          return obj;
        });

        const msgsByChatId = {};
        let lastSeenChatId = null;

        allMessages.forEach(m => {
          let cid = m['Chat Id'];
          
          if (!cid || cid.includes('undefined')) {
            cid = lastSeenChatId;
          } else {
            lastSeenChatId = cid;
          }

          if (!cid) return;
          if (!msgsByChatId[cid]) msgsByChatId[cid] = [];
          
          let timeStr = m['time'] || '';
          if (timeStr && !isNaN(timeStr)) {
            timeStr = new Date(parseInt(timeStr) * 1000).toLocaleString();
          }

          msgsByChatId[cid].push({
            id: m['message id'],
            from: (m['sender'] || '').toLowerCase() === 'agent' ? 'agent' : 'customer',
            text: m['message'] || '',
            time: timeStr || m['time']
          });
        });

        const rows = casesData.values;

        if (rows && rows.length > 1) {
          const headers = rows[0];
          const formattedData = rows.slice(1).map((row, index) => {
            const rawObj = {};
            headers.forEach((header, i) => {
              rawObj[header.trim()] = row[i]; // Trim to avoid 'number ' issues
            });
            
            const phone = rawObj['number'] || 'Unknown Phone';
            const chatId = `CHAT-${phone}`;
            const customerMsgs = msgsByChatId[chatId] || [];
            const lastMsg = customerMsgs.length > 0 ? customerMsgs[customerMsgs.length - 1] : null;

            return {
              id: rawObj['unique number'] || `case-${index + 1000}`,
              customer: rawObj['Name'] || 'Unknown Customer',
              phone: phone,
              email: rawObj['gmail'] || '',
              status: 'New',
              assignee: 'Unassigned',
              priority: '3 - Moderate',
              channel: rawObj['channel'] || 'Unknown',
              opened: rawObj['starting data'] || 'Recently',
              customerSince: rawObj['starting data'] || 'New',
              shortDescription: 'No description',
              unread: 0,
              lastMessage: lastMsg ? lastMsg.text : '',
              lastMessageTime: lastMsg ? lastMsg.time : '',
              messages: customerMsgs,
              // Include the original data just in case
              ...rawObj
            };
          });
          setCases(formattedData);
        } else {
          setCases([]);
        }
      } catch (err) {
        console.error("Google Sheets API Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const updateCase = useCallback((id, updates) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, [])

  const addMessage = useCallback((id, message) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: [...c.messages, message],
              lastMessage: message.from === 'agent' ? `You: ${message.text}` : message.text,
              lastMessageTime: message.time,
            }
          : c
      )
    )
  }, [])

  return (
    <CasesContext.Provider value={{ cases, loading, error, updateCase, addMessage }}>
      {children}
    </CasesContext.Provider>
  )
}

export function useCases() {
  const ctx = useContext(CasesContext)
  if (!ctx) throw new Error('useCases must be used within CasesProvider')
  return ctx
}
