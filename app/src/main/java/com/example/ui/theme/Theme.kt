package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = EmeraldPrimary,
    onPrimary = EmeraldOnPrimary,
    primaryContainer = EmeraldContainer,
    onPrimaryContainer = EmeraldOnContainer,
    secondary = AmberBreak,
    onSecondary = AmberOnBreak,
    secondaryContainer = AmberContainer,
    onSecondaryContainer = AmberOnContainer,
    error = CrimsonAlarm,
    onError = CrimsonOnAlarm,
    errorContainer = CrimsonContainer,
    onErrorContainer = CrimsonOnContainer,
    background = SlateDarkBackground,
    onBackground = SlateTextPrimary,
    surface = SlateDarkSurface,
    onSurface = SlateTextPrimary,
    surfaceVariant = SlateDarkCard,
    onSurfaceVariant = SlateTextSecondary,
    outline = SlateBorder
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF059669),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFA7F3D0),
    onPrimaryContainer = Color(0xFF064E3B),
    secondary = Color(0xFFD97706),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFDE68A),
    onSecondaryContainer = Color(0xFF78350F),
    error = Color(0xFFDC2626),
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF7F1D1D),
    background = SlateLightBackground,
    onBackground = SlateLightTextPrimary,
    surface = SlateLightSurface,
    onSurface = SlateLightTextPrimary,
    surfaceVariant = SlateLightCard,
    onSurfaceVariant = SlateLightTextSecondary,
    outline = Color(0xFFCBD5E1)
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Keep consistent branding colors by default
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
