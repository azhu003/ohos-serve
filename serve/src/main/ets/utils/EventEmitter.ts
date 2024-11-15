/*
 * The MIT License (MIT)
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 */
/**
 * 事件触发和事件监听器类
 */
export abstract class EventEmitter {
  // 监听器队列
  private listenerObject;

  constructor() {
    // 初始化监听器队列
    this.listenerObject = {};
  }

  /**
   * @description 为指定事件注册一个监听器，接受一个字符串 event 和一个回调函数。
   * @param eventName 字符串，事件名称
   * @param callback 处理事件函数
   */
  on(eventName, callback): EventEmitter {
    if (!this.listenerObject[eventName]) {
      this.listenerObject[eventName] = [];
    }
    this.listenerObject[eventName].push(callback);
    return this
  }

  /**
   * @description 移除指定事件的某个监听器，监听器必须是该事件已经注册过的监听器。
   * 它接受两个参数，第一个是事件名称，第二个是回调函数名称。
   * @param eventName 字符串，事件名称
   * @param callback 处理事件函数名称
   */
  off(eventName, callback): void {
    if (this.listenerObject[eventName]) {
      const index = this.listenerObject[eventName].indexOf(callback);
      if (index !== -1) {
        this.listenerObject[eventName].splice(index, 1);
      }
      if (this.listenerObject[eventName].length === 0) {
        delete this.listenerObject[eventName];
      }
    }
  }

  /**
   * @description 移除所有事件的所有监听器， 如果指定事件，则移除指定事件的所有监听器。
   * @param eventName 事件名称
   */
  removeAllListeners(eventName?): void {
    if (Boolean(!eventName)) {
      this.listenerObject = {};
    }
    if (this.listenerObject[eventName]) {
      delete this.listenerObject[eventName];
    }
  }

  /**
   * @description 返回指定事件的监听器数组。
   * @param eventName 字符串，事件名称
   * @returns 监听器数组
   */
  listeners(eventName): void {
    return this.listenerObject[eventName] || [];
  }

  /**
   * @description 按监听器的顺序执行执行每个监听器
   * @param eventName 字符串，事件名称
   * @param args 每个监听器
   */
  emit(eventName, ...args): void {
    if (this.listenerObject[eventName]) {
      this.listenerObject[eventName].forEach(callback => {
        callback(...args);
      });
    }
  }
}