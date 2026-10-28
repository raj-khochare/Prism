package com.prism.prism_Backend.dto;

/** velocity = tx per block, gas = k gas, deviation = oracle deviation %, flow = k USD moved. */
public record TelemetryPoint(String time, double velocity, double gas, double deviation, double flow) {}
