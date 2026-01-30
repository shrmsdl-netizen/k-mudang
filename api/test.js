export default function handler(req, res) {
  res.status(200).json({ message: "API works!", time: new Date().toISOString() });
}
```

5. **Commit changes**

---

1분 후 테스트:
```
https://k-mudang.vercel.app/api/test
