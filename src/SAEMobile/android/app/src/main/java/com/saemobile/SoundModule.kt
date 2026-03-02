package com.saemobile

import android.media.MediaPlayer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SoundModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var player: MediaPlayer? = null

    override fun getName() = "SoundPlayer"

    @ReactMethod
    fun play(soundName: String) {
        player?.apply { stop(); release() }
        val resId = reactApplicationContext.resources.getIdentifier(
            soundName.removeSuffix(".wav"),
            "raw",
            reactApplicationContext.packageName
        )
        if (resId == 0) return
        player = MediaPlayer.create(reactApplicationContext, resId)?.apply {
            setVolume(1f, 1f)
            isLooping = true   // repite hasta que JS llame stop()
            start()
        }
    }

    /** Reproduce una vez sin loop — para el sonido de cancelación */
    @ReactMethod
    fun playOnce(soundName: String) {
        player?.apply { stop(); release() }
        val resId = reactApplicationContext.resources.getIdentifier(
            soundName.removeSuffix(".wav"),
            "raw",
            reactApplicationContext.packageName
        )
        if (resId == 0) return
        player = MediaPlayer.create(reactApplicationContext, resId)?.apply {
            setVolume(1f, 1f)
            isLooping = false
            setOnCompletionListener { mp -> mp.release(); if (player == mp) player = null }
            start()
        }
    }

    @ReactMethod
    fun stop() {
        player?.apply { stop(); release() }
        player = null
    }
}
