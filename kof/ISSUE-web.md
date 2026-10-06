# kof.web 0.3.22-beta: `status()` always 500 on JVM, `listen(String)` VerifyError, and the Native web runtime is a stub

Porting a small Node/Express app (mytarot.day — 6 routes, no DB) to Kof. The
routing core works well, but I hit three separate problems in `kof.web`.
All verified with a running server and `curl`.

**Environment:** kof 0.3.22-beta, official linux-x86_64 distribution, Linux x86_64.

---

## 1. JVM: `status(code)` always produces 500

```kof
main() {
    var app = web.app()
    app.get("/sonly") {
        status(418)
        return "so status"
    }
    app.listen(8100)
}
```

`curl -i localhost:8100/sonly` → `HTTP/1.1 500 Internal Server Error`.
Expected `418` with body `so status`.

Nothing is logged by the server — the 500 is silent. Any code does it, not just
418. `headerSet()` in the same position works fine (header lands in the
response, 200 OK), so it is specific to `status()`.

This blocks any non-200/404 response: the app I am porting needs a `301` for
the canonical-host/HTTPS redirect.

## 2. JVM: `app.listen("8100")` (String) crashes with VerifyError

```kof
app.listen("8100")   // String
```

```
java.lang.VerifyError: Bad type on operand stack
  Location: Default/Main.main([Ljava/lang/String;)V @63: invokestatic
  Reason: Type 'java/lang/String' (current frame, stack[1]) is not assignable to integer
```

`app.listen(8100)` with an Int works. Two things here: the type checker should
reject the String at `kof check` instead of emitting bad bytecode, and
`training/idioms/web.md` line 29 shows exactly the String form:

```kof
app.listen("8080")
```

## 3. Native: the web runtime is a stub, and fails as raw `ld` errors

Docs list the web stack as JVM-only with a `WEB001` diagnostic. In practice the
Native target **does** link and serve a simple GET — an ELF `Main` answered
`200 ok` on port 8101 — but everything else is missing, and the failures are
raw linker errors rather than `WEB001`:

```
undefined reference to `kof_web_param'
undefined reference to `kof_web_header_set'
undefined reference to `status'
```

Beyond that, with `--target native`:

- `return null` responds **200 with an empty body** instead of 404 (JVM
  correctly returns 404 for the same code).
- `POST` is inconsistent **between runs of the same source**: once the server
  stayed up and the POST never answered (curl exit 000), another time the
  process exited immediately with code 0 right after `listen`. Nothing logged
  either time.

If the web stack is not meant to work on Native, the compile-time `WEB001`
diagnostic would be much friendlier than `ld` output — and it would stop
someone shipping a GET-only native server that silently 200s where it should
404.

---

Happy to split these into three issues if you prefer. Repro files available.
