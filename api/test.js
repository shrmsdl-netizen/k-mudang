module.exports = (req, res) => {
  res.status(200).json({ message: "API works!", time: new Date().toISOString() });
};
```

**Commit changes**

---

1분 후 다시:
```
https://k-mudang.vercel.app/api/test
