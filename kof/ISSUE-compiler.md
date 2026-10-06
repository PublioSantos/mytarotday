# 0.3.22-beta: `json.decode<Map<String,T>>` has no runtime method, and `Int` → `Long` field store emits no I2L

Two compiler/runtime bugs found while porting a Node app to Kof. Both pass
`kof check`.

**Environment:** kof 0.3.22-beta, official linux-x86_64 distribution, Linux x86_64.

---

## 1. `json.decode<Map<String, T>>` — `NoSuchMethodError` at runtime

`t.json`:
```json
{"0":{"name":"The Fool","upright":"a fresh start"},"1":{"name":"The Magician","upright":"focus"}}
```

```kof
record CardText(String name, String upright)

main() {
    var raw = File("t.json").readText()
    if (raw != null) {
        var m = json.decode<Map<String, CardText>>(raw)
        println("size: " + m.size)
    }
}
```

`kof check` → no errors. `kof run` →

```
java.lang.NoSuchMethodError: 'java.lang.Object dev.kof.runtime.KofRuntime.kof_json_decode_Map(java.lang.String)'
```

`json.decode<List<CardText>>` works, and a record containing `List<String>`
decodes fine — it is specifically the Map form. The compiler emits a call to a
runtime method that does not exist, so either the runtime method is missing or
the type should be rejected at check time.

This matters for real-world JSON: locale/config files are very often keyed
objects rather than arrays. My workaround was a build step that flattens keyed
maps into arrays aligned by id.

## 2. `Int` assigned to a `Long` field emits `putfield` without `I2L`

```kof
class Holder {
    Long value
    public constructor(Int n) {
        this.value = n
    }
}

main() {
    var h = new Holder(42)
    println(h.value)
}
```

`kof check` → no errors. `kof run` →

```
java.lang.VerifyError: Bad type on operand stack
  Location: Holder.<init>(I)V @6: putfield
  Reason: Type integer (current frame, stack[1]) is not assignable to long_2nd
```

`docs/language-reference/type-system.md` documents numeric widening as allowed
(`primitiveWidth(int)=2 <= primitiveWidth(long)=3`), so the assignment should
be valid — the backend just needs the `I2L` before `putfield`.

Worth noting: in a constructor with a branch it is worse than a VerifyError —
it takes the compiler down:

```
frame crash em Rng.<init> (super=java/lang/Object): sem posição Kof no IR
  fase: JVM backend / ASM COMPUTE_FRAMES (visitMaxs)
  erro ASM: NegativeArraySizeException: -1
  IR: KofLoadLocal[type=int, index=1] / KofStoreField[name=state, fieldType=long]
```

The IR line shows it directly: an `int` local stored into a `long` field with
no conversion. Workaround: `this.value = n as Long`.
