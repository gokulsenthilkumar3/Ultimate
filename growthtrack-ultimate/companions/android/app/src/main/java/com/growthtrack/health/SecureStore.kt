package com.growthtrack.health

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** One AES-GCM sealed metadata blob. The AES key is nonexportable in Android Keystore. */
class SecureStore(context: Context) {
    private val prefs = context.getSharedPreferences("health_companion_sealed_v1", Context.MODE_PRIVATE)
    private val alias = "growthtrack_health_v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        Wire.requireSafe(!prefs.contains("sealed")) // Never overwrite an unreadable existing credential blob.
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).setRandomizedEncryptionRequired(true).build())
        }.generateKey()
    }
    fun load(): JSONObject {
        val encoded = prefs.getString("sealed", null) ?: return emptyState()
        val sealed = Base64.decode(encoded, Base64.NO_WRAP)
        Wire.requireSafe(sealed.size in 29..65536)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, sealed.copyOfRange(0, 12)))
        cipher.updateAAD(alias.toByteArray(Charsets.UTF_8))
        return JSONObject(String(cipher.doFinal(sealed.copyOfRange(12, sealed.size)), Charsets.UTF_8))
    }
    fun save(state: JSONObject) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        cipher.updateAAD(alias.toByteArray(Charsets.UTF_8))
        val bytes = state.toString().toByteArray(Charsets.UTF_8)
        Wire.requireSafe(bytes.size < 60000 && cipher.iv.size == 12)
        val encrypted = cipher.iv + cipher.doFinal(bytes)
        if (!prefs.edit().putString("sealed", Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit())
            throw CompanionFailure("Secure persistence failed; sync cursor was not advanced.")
    }
    companion object {
        fun emptyState() = JSONObject().put("endpoint", "").put("selected", JSONObject())
            .put("cursors", JSONObject()).put("lastRead", JSONObject()).put("lastAck", JSONObject())
            .put("newestSample", JSONObject()).put("disconnectPending", false)
    }
}
