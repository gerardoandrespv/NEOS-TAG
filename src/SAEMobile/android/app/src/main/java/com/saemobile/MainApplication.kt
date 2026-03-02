package com.saemobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SoundPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createSaeNotificationChannels()
  }

  private fun createSaeNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      val audioAttr = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

      // Un canal por tipo de alerta, cada uno con su sonido propio
      // v2: IDs bumped para forzar recreación de canales con sonidos correctos
      val channels = listOf(
        Triple("sae_fire_v2",        "SAE — Incendio",       "emergency_alarm_fire"),
        Triple("sae_earthquake_v2",  "SAE — Terremoto",      "emergency_alarm_fire"),       // urgencia máxima
        Triple("sae_evacuation_v2",  "SAE — Evacuación",     "emergency_alarm_evacuation"),
        Triple("sae_robbery_v2",     "SAE — Robo",           "emergency_alarm_evacuation"), // abandona el área
        Triple("sae_fight_v2",       "SAE — Agresión",       "emergency_alarm_evacuation"), // abandona el área
        Triple("sae_flood_v2",       "SAE — Inundación",     "emergency_alarm_flood"),
        Triple("sae_tsunami_v2",     "SAE — Tsunami",        "emergency_alarm_flood"),
        Triple("sae_power_outage_v2","SAE — Corte de Luz",   "emergency_alarm_general"),
        Triple("sae_general_v2",     "SAE — Emergencia",     "emergency_alarm_general"),
        Triple("sae_cancel_v2",      "SAE — Cancelación",    "emergency_alarm_cancel"),
      )

      for ((id, name, soundRes) in channels) {
        val soundUri = Uri.parse("android.resource://${packageName}/raw/$soundRes")
        val channel = NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Alertas de emergencia SAE"
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
          setSound(soundUri, audioAttr)
        }
        nm.createNotificationChannel(channel)
      }
    }
  }
}
